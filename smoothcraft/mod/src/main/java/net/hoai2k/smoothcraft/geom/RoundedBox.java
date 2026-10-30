package net.hoai2k.smoothcraft.geom;

import java.util.Arrays;

/**
 * Rebuilds a model box (a mob's head, an arm, a chest lid) as a rounded box.
 *
 * <p>Each face is cut into a grid that is fine near the edges and coarse in
 * the middle, and every grid point is pushed onto the box with its edges and
 * corners rounded to radius r (the Minkowski sum of a smaller box and a
 * sphere, or an ellipsoid where the sides differ). Sides marked as attached
 * (where the box joins another box of the same part, like a villager's
 * forearm meeting its upper arms) get no rounding, so the edges around them
 * stay sharp and the pieces join flush instead of looking cut apart. The
 * texture coordinates stay those of the flat face, so the vanilla UV layout
 * (and any high-resolution texture painted on it) wraps the rounded shape.
 * Neighbouring faces meet exactly at the old edges.
 */
public final class RoundedBox {
	/** Floats per output vertex: x, y, z, u, v, nx, ny, nz. */
	public static final int STRIDE = 8;

	/** Bit for each side in an attached mask: -x, +x, -y, +y, -z, +z. */
	public static int side(int axis, boolean positive) {
		return 1 << (axis * 2 + (positive ? 1 : 0));
	}

	private RoundedBox() {
	}

	/** A box rounded on every side. */
	public static float[] build(float[][][] faces, float roundness, float maxRadius, int bands) {
		return build(faces, roundness, maxRadius, bands, 0);
	}

	/**
	 * @param faces     one entry per face: 4 vertices of {x, y, z, u, v}, in the box's own order
	 * @param roundness radius as a fraction of the box's smallest half-extent (0 keeps it square)
	 * @param maxRadius cap on the radius, in the same units as the positions
	 * @param bands     grid lines across each rounded band (1 = a single bevel)
	 * @param attached  {@link #side} bits for the sides that join another box and stay sharp
	 * @return vertices, 4 per quad, {@link #STRIDE} floats each; null when the box can't be rounded
	 */
	public static float[] build(float[][][] faces, float roundness, float maxRadius, int bands, int attached) {
		float[] min = {Float.MAX_VALUE, Float.MAX_VALUE, Float.MAX_VALUE};
		float[] max = {-Float.MAX_VALUE, -Float.MAX_VALUE, -Float.MAX_VALUE};
		for (float[][] face : faces) {
			for (float[] v : face) {
				for (int c = 0; c < 3; c++) {
					min[c] = Math.min(min[c], v[c]);
					max[c] = Math.max(max[c], v[c]);
				}
			}
		}
		float half = Math.min(max[0] - min[0], Math.min(max[1] - min[1], max[2] - min[2])) * 0.5f;
		float r = Math.min(half * roundness, maxRadius);
		if (faces.length == 0 || r < 1e-3f || (attached & 0x3F) == 0x3F) {
			return null;
		}
		// Radius on each side: rNeg[a] toward -a, rPos[a] toward +a.
		float[] rNeg = new float[3], rPos = new float[3], lo = new float[3], hi = new float[3];
		for (int a = 0; a < 3; a++) {
			rNeg[a] = (attached & side(a, false)) != 0 ? 0f : r;
			rPos[a] = (attached & side(a, true)) != 0 ? 0f : r;
			lo[a] = min[a] + rNeg[a];
			hi[a] = max[a] - rPos[a];
		}

		float[] out = new float[0];
		int n = 0;
		for (float[][] face : faces) {
			float[] ss = edgeParams(face[0], face[1], rNeg, rPos, bands);
			float[] ts = edgeParams(face[1], face[2], rNeg, rPos, bands);
			int quads = (ss.length - 1) * (ts.length - 1);
			out = Arrays.copyOf(out, out.length + quads * 4 * STRIDE);
			float[] faceNormal = faceNormal(face);
			for (int i = 0; i + 1 < ss.length; i++) {
				for (int j = 0; j + 1 < ts.length; j++) {
					n = vertex(out, n, face, ss[i], ts[j], lo, hi, rNeg, rPos, faceNormal);
					n = vertex(out, n, face, ss[i + 1], ts[j], lo, hi, rNeg, rPos, faceNormal);
					n = vertex(out, n, face, ss[i + 1], ts[j + 1], lo, hi, rNeg, rPos, faceNormal);
					n = vertex(out, n, face, ss[i], ts[j + 1], lo, hi, rNeg, rPos, faceNormal);
				}
			}
		}
		return out;
	}

	/** Grid positions along the face edge from a to b, with a rounded band at each end as wide as that side's radius. */
	private static float[] edgeParams(float[] a, float[] b, float[] rNeg, float[] rPos, int bands) {
		int axis = 0;
		for (int c = 1; c < 3; c++) {
			if (Math.abs(b[c] - a[c]) > Math.abs(b[axis] - a[axis])) {
				axis = c;
			}
		}
		boolean increasing = b[axis] > a[axis];
		return params(dist(a, b), increasing ? rNeg[axis] : rPos[axis], increasing ? rPos[axis] : rNeg[axis], bands);
	}

	/** Uniform bands at both ends. */
	static float[] params(float length, float r, int bands) {
		return params(length, r, r, bands);
	}

	/**
	 * Grid positions (0..1) along an edge of the given length: inside each
	 * rounded band (rStart at 0, rEnd at 1) they are spaced by equal angle on
	 * the rounding.
	 */
	static float[] params(float length, float rStart, float rEnd, int bands) {
		if (length < 1e-5f) {
			return new float[] {0f, 1f};
		}
		float bandStart = Math.min(rStart, length * 0.5f), bandEnd = Math.min(rEnd, length * 0.5f);
		float[] p = new float[2 * bands + 2];
		int k = 0;
		for (int i = 0; i <= bands; i++) {
			float shape = i == bands ? 0f : (float) (1 - Math.tan(Math.PI / 4 * i / bands));
			p[k++] = bandStart * shape / length;
			p[k++] = 1 - bandEnd * shape / length;
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

	private static int vertex(float[] out, int n, float[][] f, float s, float t, float[] lo, float[] hi, float[] rNeg, float[] rPos, float[] faceNormal) {
		float w0 = (1 - s) * (1 - t), w1 = s * (1 - t), w2 = s * t, w3 = (1 - s) * t;
		float[] p = new float[5];
		for (int c = 0; c < 5; c++) {
			p[c] = f[0][c] * w0 + f[1][c] * w1 + f[2][c] * w2 + f[3][c] * w3;
		}
		// Offset from the inner box, measured in units of each side's radius.
		float[] core = new float[3], d = new float[3], e = new float[3];
		float len2 = 0;
		for (int c = 0; c < 3; c++) {
			core[c] = clamp(p[c], lo[c], hi[c]);
			d[c] = p[c] - core[c];
			float r = d[c] > 0 ? rPos[c] : rNeg[c];
			e[c] = r > 1e-6f ? d[c] / r : 0f;
			len2 += e[c] * e[c];
		}
		float len = (float) Math.sqrt(len2);
		float[] q = new float[3], nrm = new float[3];
		if (len < 1e-6f) {
			System.arraycopy(p, 0, q, 0, 3);
			System.arraycopy(faceNormal, 0, nrm, 0, 3);
		} else {
			float nl = 0;
			for (int c = 0; c < 3; c++) {
				float r = d[c] > 0 ? rPos[c] : rNeg[c];
				q[c] = core[c] + d[c] / len;
				nrm[c] = r > 1e-6f ? e[c] / r : 0f;
				nl += nrm[c] * nrm[c];
			}
			nl = (float) Math.sqrt(nl);
			for (int c = 0; c < 3; c++) {
				nrm[c] /= nl;
			}
		}
		out[n] = q[0];
		out[n + 1] = q[1];
		out[n + 2] = q[2];
		out[n + 3] = p[3];
		out[n + 4] = p[4];
		out[n + 5] = nrm[0];
		out[n + 6] = nrm[1];
		out[n + 7] = nrm[2];
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

	/**
	 * Which sides of box {@code a} join one of {@code others} (all as
	 * {minX, minY, minZ, maxX, maxY, maxZ}): a side is attached when another box
	 * reaches its plane and covers part of it.
	 */
	public static int attachedSides(float[] a, float[][] others) {
		final float eps = 0.01f;
		int mask = 0;
		for (float[] b : others) {
			if (b == a) {
				continue;
			}
			for (int axis = 0; axis < 3; axis++) {
				int u = (axis + 1) % 3, v = (axis + 2) % 3;
				boolean overlapsFace = Math.min(a[u + 3], b[u + 3]) - Math.max(a[u], b[u]) > eps
						&& Math.min(a[v + 3], b[v + 3]) - Math.max(a[v], b[v]) > eps;
				if (!overlapsFace) {
					continue;
				}
				// A side is attached when the other box reaches its plane from outside
				// (touching it, or crossing it), not when it sits inside flush with it.
				float top = a[axis + 3], bottom = a[axis];
				if (b[axis] <= top + eps && b[axis + 3] >= top - eps && (b[axis + 3] > top + eps || b[axis] >= top - eps)) {
					mask |= side(axis, true);
				}
				if (b[axis] <= bottom + eps && b[axis + 3] >= bottom - eps && (b[axis] < bottom - eps || b[axis + 3] <= bottom + eps)) {
					mask |= side(axis, false);
				}
			}
		}
		return mask;
	}
}
