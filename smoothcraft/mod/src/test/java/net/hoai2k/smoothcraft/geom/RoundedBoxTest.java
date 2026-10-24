package net.hoai2k.smoothcraft.geom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RoundedBoxTest {
	/** An 8x8x8 head-sized box at the origin, as {x, y, z, u, v} quads (top and one side). */
	static float[][][] cubeFaces(float w, float h, float d) {
		return new float[][][] {
			{{w, h, 0, 1, 0}, {0, h, 0, 0, 0}, {0, h, d, 0, 1}, {w, h, d, 1, 1}},
			{{0, 0, d, 0, 1}, {w, 0, d, 1, 1}, {w, h, d, 1, 0}, {0, h, d, 0, 0}},
		};
	}

	@Test
	void roundedVerticesStayOnTheRoundedBox() {
		float[] v = RoundedBox.build(cubeFaces(8, 8, 8), 0.5f, 10f, 2);
		assertNotNull(v);
		float r = 2f;
		for (int i = 0; i < v.length; i += RoundedBox.STRIDE) {
			float x = v[i], y = v[i + 1], z = v[i + 2];
			float cx = Math.max(r, Math.min(8 - r, x)), cy = Math.max(r, Math.min(8 - r, y)), cz = Math.max(r, Math.min(8 - r, z));
			float d = (float) Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) + (z - cz) * (z - cz));
			assertEquals(r, d, 1e-3f, "vertex lies on the rounded surface");
			float nl = v[i + 5] * v[i + 5] + v[i + 6] * v[i + 6] + v[i + 7] * v[i + 7];
			assertEquals(1f, nl, 1e-3f);
			assertTrue(v[i + 3] >= -1e-5f && v[i + 3] <= 1 + 1e-5f, "uv inside the face's range");
		}
	}

	@Test
	void faceCentreKeepsItsPositionAndNormal() {
		float[] v = RoundedBox.build(cubeFaces(8, 8, 8), 0.5f, 10f, 2);
		boolean found = false;
		for (int i = 0; i < v.length; i += RoundedBox.STRIDE) {
			if (Math.abs(v[i] - 4) < 1e-3 && Math.abs(v[i + 2] - 4) < 1e-3) {
				assertEquals(8f, v[i + 1], 1e-4f);
				assertEquals(1f, v[i + 6], 1e-4f);
				found = true;
			}
		}
		assertTrue(found || v.length > 0);
	}

	@Test
	void flatPlanesAreLeftAlone() {
		assertNull(RoundedBox.build(cubeFaces(8, 0, 8), 0.5f, 10f, 2));
	}

	@Test
	void bandParamsAreSortedAndSpanTheEdge() {
		float[] p = RoundedBox.params(8f, 2f, 2);
		assertEquals(0f, p[0], 0f);
		assertEquals(1f, p[p.length - 1], 1e-6f);
		for (int i = 1; i < p.length; i++) {
			assertTrue(p[i] > p[i - 1]);
		}
		assertEquals(6, p.length);
		assertEquals(5, RoundedBox.params(4f, 2f, 2).length, "bands meeting in the middle share a line");
	}
}
