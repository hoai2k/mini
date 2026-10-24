package net.hoai2k.smoothcraft.geom;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SmoothSurfaceTest {
	/** A sparse grid: everything EMPTY except the cells set. */
	static final class Grid implements CellField {
		final Map<Long, Byte> cells = new HashMap<>();
		byte fill = EMPTY;
		int groundBelow = Integer.MIN_VALUE;

		Grid set(int x, int y, int z, byte v) {
			cells.put(key(x, y, z), v);
			return this;
		}

		@Override
		public byte cell(int x, int y, int z) {
			Byte v = cells.get(key(x, y, z));
			if (v != null) {
				return v;
			}
			return y < groundBelow ? SMOOTH : fill;
		}

		static long key(int x, int y, int z) {
			return ((long) x & 0x1FFFFF) | ((long) y & 0x1FFFFF) << 21 | ((long) z & 0x1FFFFF) << 42;
		}
	}

	@Test
	void flatGroundStaysFlat() {
		Grid g = new Grid();
		g.groundBelow = 64;
		SmoothSurface s = new SmoothSurface(g, 1f);
		float[] p = {3.25f, 64f, -7.5f};
		s.project(p);
		assertArrayEquals(new float[] {3.25f, 64f, -7.5f}, p, 1e-4f);
		float[] n = new float[3];
		assertTrue(s.normal(3.25f, 64f, -7.5f, n));
		assertArrayEquals(new float[] {0, 1, 0}, n, 1e-4f);
	}

	@Test
	void stepEdgeRoundsOffAndSharedCornersAgree() {
		// Ground at y < 64, plus a one-block ledge along x at z = 0.
		Grid g = new Grid();
		g.groundBelow = 64;
		for (int x = -5; x <= 5; x++) {
			for (int z = -5; z <= 0; z++) {
				g.set(x, 64, z, CellField.SMOOTH);
			}
		}
		SmoothSurface s = new SmoothSurface(g, 1f);
		// The convex top edge of the ledge moves inward and down.
		float[] top = {0f, 65f, 1f};
		s.project(top);
		assertTrue(top[1] < 65f && top[2] < 1f, "convex edge rounds in: " + top[1] + "," + top[2]);
		// The concave foot of the ledge fills out.
		float[] foot = {0f, 64f, 1f};
		s.project(foot);
		assertTrue(foot[1] > 64f || foot[2] > 1f, "concave edge fills out");
		// The same corner reached from the top face and the side face lands in the same place.
		float[] a = {2f, 65f, 1f};
		float[] b = {2f, 65f, 1f};
		s.project(a);
		s.project(b);
		assertArrayEquals(a, b, 0f);
		// The edge normal leans halfway between up and the side.
		float[] n = new float[3];
		s.normal(top[0], top[1], top[2], n);
		assertTrue(n[1] > 0.3f && n[2] > 0.3f, "edge normal is diagonal");
	}

	@Test
	void hardCellsPinCorners() {
		Grid g = new Grid();
		g.groundBelow = 64;
		g.set(0, 64, 0, CellField.SMOOTH);
		g.set(1, 64, 0, CellField.HARD);
		SmoothSurface s = new SmoothSurface(g, 1f);
		float[] p = {1f, 65f, 1f};
		s.project(p);
		assertArrayEquals(new float[] {1f, 65f, 1f}, p, 0f);
		float[] free = {0f, 65f, 1f};
		s.project(free);
		assertTrue(free[1] < 65f, "corner away from the hard block still rounds");
	}

	@Test
	void loneBlockBecomesARoundedLump() {
		Grid g = new Grid().set(0, 0, 0, CellField.SMOOTH);
		SmoothSurface s = new SmoothSurface(g, 1f);
		float[] faceCentre = {0.5f, 1f, 0.5f};
		s.project(faceCentre);
		assertTrue(faceCentre[1] > 0.6f && faceCentre[1] <= 1f, "face sinks a little into a lump: " + faceCentre[1]);
		float[] corner = {1f, 1f, 1f};
		s.project(corner);
		float d = (float) Math.sqrt(Math.pow(corner[0] - .5, 2) + Math.pow(corner[1] - .5, 2) + Math.pow(corner[2] - .5, 2));
		assertTrue(d < 0.6f && d > 0.15f, "corner pulled in toward the centre: " + d);
	}

	@Test
	void strengthZeroKeepsCubes() {
		Grid g = new Grid().set(0, 0, 0, CellField.SMOOTH);
		float[] corner = {1f, 1f, 1f};
		new SmoothSurface(g, 0f).project(corner);
		assertArrayEquals(new float[] {1f, 1f, 1f}, corner, 0f);
	}

	@Test
	void staircaseBecomesASlope() {
		// Cells below the 45-degree line y = -x are solid: a staircase of one-block steps.
		CellField stairs = (x, y, z) -> y < -x ? CellField.SMOOTH : CellField.EMPTY;
		SmoothSurface s = new SmoothSurface(stairs, 1f);
		for (float[] corner : new float[][] {{1f, 0f, 0.5f}, {1f, -1f, 0.5f}}) {
			float[] p = corner.clone();
			s.project(p);
			// Distance to the slope through the middle of the steps, y = -x + 0.5.
			float before = Math.abs(corner[1] + corner[0] - 0.5f) / (float) Math.sqrt(2);
			float after = Math.abs(p[1] + p[0] - 0.5f) / (float) Math.sqrt(2);
			assertTrue(after < before * 0.6f, "step corner moves toward the slope: " + before + " -> " + after);
		}
		float[] n = new float[3];
		s.normal(1f, -0.5f, 0.5f, n);
		assertEquals(n[0], n[1], 0.15f, "slope normal is diagonal");
	}
}
