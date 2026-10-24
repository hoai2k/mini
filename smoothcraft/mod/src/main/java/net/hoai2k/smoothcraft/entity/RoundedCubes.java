package net.hoai2k.smoothcraft.entity;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import java.util.Collections;
import java.util.Map;
import java.util.WeakHashMap;
import net.hoai2k.smoothcraft.SmoothConfig;
import net.hoai2k.smoothcraft.geom.RoundedBox;
import net.minecraft.client.model.geom.ModelPart;
import org.joml.Matrix4f;
import org.joml.Vector3f;

/**
 * Rounded versions of model boxes, built once per box and drawn in place of
 * the six flat faces. The vanilla pose, animation and UVs all still apply.
 */
public final class RoundedCubes {
	private record Mesh(int version, float[] vertices) {
	}

	private static final float[] NONE = new float[0];
	private static final Map<ModelPart.Cube, Mesh> MESHES = Collections.synchronizedMap(new WeakHashMap<>());

	private RoundedCubes() {
	}

	/** Draws the box rounded; false when it should be drawn the vanilla way. */
	public static boolean render(ModelPart.Cube cube, PoseStack.Pose pose, VertexConsumer builder, int light, int overlay, int color) {
		SmoothConfig config = SmoothConfig.get();
		if (!config.roundEntities || config.entityRoundness <= 0f) {
			return false;
		}
		float[] v = mesh(cube, config);
		if (v.length == 0) {
			return false;
		}
		Matrix4f matrix = pose.pose();
		Vector3f pos = new Vector3f();
		Vector3f normal = new Vector3f();
		for (int i = 0; i < v.length; i += RoundedBox.STRIDE) {
			matrix.transformPosition(v[i] / 16f, v[i + 1] / 16f, v[i + 2] / 16f, pos);
			pose.transformNormal(v[i + 5], v[i + 6], v[i + 7], normal);
			builder.addVertex(pos.x(), pos.y(), pos.z(), color, v[i + 3], v[i + 4], overlay, light, normal.x(), normal.y(), normal.z());
		}
		return true;
	}

	private static float[] mesh(ModelPart.Cube cube, SmoothConfig config) {
		int version = SmoothConfig.version();
		Mesh mesh = MESHES.get(cube);
		if (mesh == null || mesh.version != version) {
			mesh = new Mesh(version, build(cube, config));
			MESHES.put(cube, mesh);
		}
		return mesh.vertices;
	}

	private static float[] build(ModelPart.Cube cube, SmoothConfig config) {
		float[][][] faces = new float[cube.polygons.length][][];
		for (int f = 0; f < faces.length; f++) {
			ModelPart.Vertex[] vertices = cube.polygons[f].vertices();
			if (vertices.length != 4) {
				return NONE;
			}
			faces[f] = new float[4][];
			for (int k = 0; k < 4; k++) {
				ModelPart.Vertex vx = vertices[k];
				faces[f][k] = new float[] {vx.x(), vx.y(), vx.z(), vx.u(), vx.v()};
			}
		}
		float[] out = RoundedBox.build(faces, config.entityRoundness, config.entityMaxRadius, config.entityBands);
		return out == null ? NONE : out;
	}
}
