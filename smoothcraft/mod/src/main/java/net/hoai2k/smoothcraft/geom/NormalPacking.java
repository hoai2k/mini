package net.hoai2k.smoothcraft.geom;

/**
 * Carries a vertex normal through the terrain vertex format, which has no
 * normal attribute. Each half of the packed lightmap coordinate (block light
 * in the low 16 bits, sky light in the high 16) only uses its low 8 bits, so
 * an octahedral normal goes in bits 8-14 of each half and bit 15 of the block
 * half says one is present. terrain.vsh unpacks it; sample_lightmap.glsl masks
 * the extra bits off for every other shader.
 */
public final class NormalPacking {
	private static final int HAS_NORMAL = 0x8000;

	private NormalPacking() {
	}

	public static int pack(int lightCoords, float nx, float ny, float nz) {
		float l1 = Math.abs(nx) + Math.abs(ny) + Math.abs(nz);
		int block = lightCoords & 0xFF;
		int sky = (lightCoords >>> 16) & 0xFF;
		if (l1 < 1e-4f) {
			return block | sky << 16;
		}
		float ox = nx / l1, oy = ny / l1;
		if (nz < 0) {
			float fx = (1 - Math.abs(oy)) * Math.signum(ox == 0 ? 1 : ox);
			float fy = (1 - Math.abs(ox)) * Math.signum(oy == 0 ? 1 : oy);
			ox = fx;
			oy = fy;
		}
		int qx = Math.round((ox * 0.5f + 0.5f) * 127f);
		int qy = Math.round((oy * 0.5f + 0.5f) * 127f);
		return (block | qx << 8 | HAS_NORMAL) | (sky | qy << 8) << 16;
	}

	/** The inverse, for tests: writes the normal and returns the plain light coordinates, or -1 without a normal. */
	public static int unpack(int packed, float[] n) {
		int blockHalf = packed & 0xFFFF;
		int skyHalf = packed >>> 16;
		int light = (blockHalf & 0xFF) | (skyHalf & 0xFF) << 16;
		if ((blockHalf & HAS_NORMAL) == 0) {
			return -1;
		}
		float ox = ((blockHalf >> 8) & 0x7F) / 127f * 2 - 1;
		float oy = ((skyHalf >> 8) & 0x7F) / 127f * 2 - 1;
		float oz = 1 - Math.abs(ox) - Math.abs(oy);
		if (oz < 0) {
			float fx = (1 - Math.abs(oy)) * Math.signum(ox == 0 ? 1 : ox);
			float fy = (1 - Math.abs(ox)) * Math.signum(oy == 0 ? 1 : oy);
			ox = fx;
			oy = fy;
		}
		float len = (float) Math.sqrt(ox * ox + oy * oy + oz * oz);
		n[0] = ox / len;
		n[1] = oy / len;
		n[2] = oz / len;
		return light;
	}
}
