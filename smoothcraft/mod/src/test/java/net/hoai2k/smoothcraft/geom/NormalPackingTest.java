package net.hoai2k.smoothcraft.geom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class NormalPackingTest {
	@Test
	void roundTripsNormalsAndKeepsLight() {
		int light = 0xA0 | 0xF0 << 16;
		float[][] normals = {{0, 1, 0}, {0, -1, 0}, {1, 0, 0}, {0, 0, -1}, {0.577f, 0.577f, -0.577f}, {-0.3f, 0.9f, 0.316f}};
		float[] out = new float[3];
		for (float[] n : normals) {
			int packed = NormalPacking.pack(light, n[0], n[1], n[2]);
			assertEquals(light, NormalPacking.unpack(packed, out));
			float len = (float) Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
			float dot = (n[0] * out[0] + n[1] * out[1] + n[2] * out[2]) / len;
			assertTrue(dot > 0.995f, "normal survives packing, dot " + dot);
			assertEquals(light, packed & 0xFF | (packed >>> 16 & 0xFF) << 16, "low bytes are still the light");
		}
	}

	@Test
	void zeroNormalMeansNone() {
		int packed = NormalPacking.pack(0x50 | 0x30 << 16, 0, 0, 0);
		assertEquals(-1, NormalPacking.unpack(packed, new float[3]));
		assertEquals(0x50 | 0x30 << 16, packed);
	}
}
