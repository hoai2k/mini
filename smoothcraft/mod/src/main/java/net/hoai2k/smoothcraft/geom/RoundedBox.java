package net.hoai2k.smoothcraft.geom;

import java.util.Arrays;

/**
 * Rebuilds a model box (a mob's head, an arm, a chest lid) as a rounded box.
 *
 * <p>Each face is cut into a grid that is fine near the edges and coarse in
 * the middle, and every grid point is pushed onto the box with its edges and
 * corners rounded to radius r (the Minkowski sum of a smaller box and a
 * sphere). The texture coordinates stay those of the flat face, so the
 * vanilla UV layout (and any high-resolution texture painted on it) wraps the
 * rounded shape. Neighbouring faces meet exactly at the old edges.
 */
public final class RoundedBox {
	/** Floats per output vertex: x, y, z, u, v, nx, ny, nz. */
	public static final int STRIDE = 8;

	private RoundedBox() {
	}

	/**
	 * @param faces     one entry per face: 4 vertices of {x, y, z, u, v}, in the box's own order
	 * @param roundness radius as a fraction of the box's smallest half-extent (0 keeps it square)
	 * @param maxRadius cap on the radius, in the same units as the positions
	 * @param bands     grid lines across each rounded band (1 = a single bevel)
	 * @return vertices, 4 per quad, {@link #STRIDE} floats each; null when the box can't be rounded
	 */
	public static float[] build(float[][][] faces, float roundness, float maxRadius, int bands) {
		float minX = Float.MAX_VALUE, minY = Float.MAX_VALUE, minZ = Float.MAX_VALUE;
		float maxX = -Float.MAX_VALUE, maxY = -Float.MAX_VALUE, maxZ = -Float.MAX_VALUE;
		for (float[][] face : faces) {
			for (float[] v : face) {
				minX = Math.min(minX, v[0]);
				minY = Math.min(minY, v[1]);
				minZ = Math.min(minZ, v[2]);
				maxX = Math.max(maxX, v[0]);
				maxY = Math.max(maxY, v[1]);
				maxZ = Math.max(maxZ, v[2]);
			}
		}
		float half = Math.min(maxX - minX, Math.min(maxY - minY, maxZ - minZ)) * 0.5f;
		float r = Math.min(half * roundness, maxRadius);
		if (faces.length == 0 || r < 1e-3f) {
			return null;
		}
		float[] lo = {minX + r, minY + r, minZ + r};
		float[] hi = {maxX - r, maxY - r, maxZ - r};

		float[] out = new float[0];
		int n = 0;
		for (float[][] face : faces) {
			float[] a = face[0], b = face[1], d = face[3];
			float ls = dist(a, b), lt = dist(b, face[2]);
			float[] ss = params(ls, r, bands), ts = params(lt, r, bands);
			int quads = (ss.length - 1) * (ts.length - 1);
			out = Arrays.copyOf(out, out.length + quads * 4 * STRIDE);
			float[] faceNormal = faceNormal(face);
			for (int i = 0; i + 1 < ss.length; i++) {
				for (int j = 0; j + 1 < ts.length; j++) {
					n = vertex(out, n, face, ss[i], ts[j], lo, hi, r, faceNormal);
					n = vertex(out, n, face, ss[i + 1], ts[j], lo, hi, r, faceNormal);
					n = vertex(out, n, face, ss[i + 1], ts[j + 1], lo, hi, r, faceNormal);
					n = vertex(out, n, face, ss[i], ts[j + 1], lo, hi, r, faceNormal);
				}
			}
		}
		return out;
	}

	/**
	 * Grid positions (0..1) along an edge of the given length: inside each
	 * rounded band of width r they are spaced by equal angle on the rounding.
	 */
	static float[] params(float length, float r, int bands) {
		if (length < 1e-5f) {
			return new float[] {0f, 1f};
		}
		float band = Math.min(r, length * 0.5f);
		float[] p = new float[2 * bands + 2];
		int k = 0;
		for (int i = 0; i <= bands; i++) {
			float inset = i == bands ? 0f : (float) (band * (1 - Math.tan(Math.PI / 4 * i / bands))) / length;
			p[k++] = inset;
			p[k++] = 1 - inset;
		}
		Arrays.sort(p);
		float[] unique = new float[p.length];
		int u = 0;
		for (float v : p) {
			if (u == 0 || v - unique[u - 1] > 1e-5f) {
				unique[u++] = v;
			}
		}
		return Arrays.copyOf(unique, u);
	}

	private static int vertex(float[] out, int n, float[][] f, float s, float t, float[] lo, float[] hi, float r, float[] faceNormal) {
		float w0 = (1 - s) * (1 - t), w1 = s * (1 - t), w2 = s * t, w3 = (1 - s) * t;
		float[] p = new float[5];
		for (int c = 0; c < 5; c++) {
			p[c] = f[0][c] * w0 + f[1][c] * w1 + f[2][c] * w2 + f[3][c] * w3;
		}
		float cx = clamp(p[0], lo[0], hi[0]), cy = clamp(p[1], lo[1], hi[1]), cz = clamp(p[2], lo[2], hi[2]);
		float dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
		float len = (float) Math.sqrt(dx * dx + dy * dy + dz * dz);
		float nx, ny, nz;
		if (len < 1e-6f) {
			nx = faceNormal[0];
			ny = faceNormal[1];
			nz = faceNormal[2];
		} else {
			nx = dx / len;
			ny = dy / len;
			nz = dz / len;
		}
		out[n] = cx + nx * r;
		out[n + 1] = cy + ny * r;
		out[n + 2] = cz + nz * r;
		out[n + 3] = p[3];
		out[n + 4] = p[4];
		out[n + 5] = nx;
		out[n + 6] = ny;
		out[n + 7] = nz;
		return n + STRIDE;
	}

	private static float[] faceNormal(float[][] f) {
		float ax = f[1][0] - f[0][0], ay = f[1][1] - f[0][1], az = f[1][2] - f[0][2];
		float bx = f[3][0] - f[0][0], by = f[3][1] - f[0][1], bz = f[3][2] - f[0][2];
		float nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
		float len = (float) Math.sqrt(nx * nx + ny * ny + nz * nz);
		return len < 1e-9f ? new float[] {0, 1, 0} : new float[] {nx / len, ny / len, nz / len};
	}

	private static float dist(float[] a, float[] b) {
		float dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
		return (float) Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

	private static float clamp(float v, float lo, float hi) {
		return lo > hi ? (lo + hi) * 0.5f : Math.max(lo, Math.min(hi, v));
	}
}
