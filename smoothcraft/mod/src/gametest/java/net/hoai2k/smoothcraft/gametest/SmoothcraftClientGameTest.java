package net.hoai2k.smoothcraft.gametest;

import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.hoai2k.smoothcraft.SmoothConfig;
import net.hoai2k.smoothcraft.Smoothcraft;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Boots the game, makes a world and photographs it with Smoothcraft on and off
 * (run/screenshots/). Run with ./gradlew runClientGameTest (needs a display;
 * xvfb-run works).
 */
public final class SmoothcraftClientGameTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		context.runOnClient(client -> client.options.renderDistance().set(6));
		try (TestSingleplayerContext world = context.worldBuilder()
				.setUseConsistentSettings(false)
				.adjustSettings(settings -> settings.setSeed("smoothcraft"))
				.create()) {
			world.getServer().runCommand("gamerule advance_time false");
			world.getServer().runCommand("gamerule advance_weather false");
			world.getServer().runCommand("time set 6000");
			world.getServer().runCommand("gamemode spectator @a");
			world.getServer().runCommand("weather clear");
			BlockPos ground = world.getServer().computeOnServer(server -> hilliest(server.overworld()));
			BlockPos open = world.getServer().computeOnServer(server -> openGround(server.overworld()));
			BlockPos villager = open.offset(3, 0, 0);
			world.getServer().runCommand("summon villager " + villager.getX() + " " + villager.getY() + " " + villager.getZ()
					+ " {NoAI:1b,Rotation:[90f,0f]}");
			world.getServer().runCommand("tp @p " + (open.getX() + 0.5) + " " + (open.getY() + 0.6) + " " + (open.getZ() + 0.5) + " -90 10");
			world.getConnection().waitForChunksRender(20 * 60 * 6);
			context.waitTicks(40);
			context.takeScreenshot("smoothcraft-villager-on");

			int eyeY = world.getServer().computeOnServer(server -> {
				int highest = ground.getY();
				for (int d = 0; d <= 14; d += 2) {
					highest = Math.max(highest, surface(server.overworld(), ground.getX() - d, ground.getZ() - d).getY());
				}
				return highest + 6;
			});
			world.getServer().runCommand("tp @p " + (ground.getX() - 14) + " " + eyeY + " " + (ground.getZ() - 14) + " -45 25");
			world.getConnection().waitForChunksRender(20 * 60 * 6);
			context.waitTicks(40);
			context.takeScreenshot("smoothcraft-terrain-noon-on");

			world.getServer().runCommand("time set 23200");
			context.waitTicks(20);
			context.takeScreenshot("smoothcraft-terrain-sunrise-on");
			world.getServer().runCommand("time set 6000");

			context.runOnClient(client -> {
				SmoothConfig.get().smoothTerrain = false;
				SmoothConfig.get().roundEntities = false;
				SmoothConfig.get().realisticLighting = false;
				SmoothConfig.changed();
				Smoothcraft.rebuildWorld(client);
			});
			world.getConnection().waitForChunksRender(20 * 60 * 6);
			context.waitTicks(40);
			context.takeScreenshot("smoothcraft-terrain-noon-off");
			world.getServer().runCommand("tp @p " + (open.getX() + 0.5) + " " + (open.getY() + 0.6) + " " + (open.getZ() + 0.5) + " -90 10");
			world.getConnection().waitForChunksRender(20 * 60 * 6);
			context.waitTicks(20);
			context.takeScreenshot("smoothcraft-villager-off");

			context.runOnClient(client -> {
				SmoothConfig.get().smoothTerrain = true;
				SmoothConfig.get().roundEntities = true;
				SmoothConfig.get().realisticLighting = true;
				SmoothConfig.changed();
			});
		}
	}

	/** A spot near spawn with the steepest ground around it, so the photos show hills. */
	private static BlockPos hilliest(ServerLevel level) {
		BlockPos spawn = level.getRespawnData().globalPos().pos();
		BlockPos best = surface(level, spawn.getX(), spawn.getZ());
		int bestRelief = -1;
		for (int dx = -96; dx <= 96; dx += 16) {
			for (int dz = -96; dz <= 96; dz += 16) {
				BlockPos here = surface(level, spawn.getX() + dx, spawn.getZ() + dz);
				int relief = 0;
				for (int[] o : new int[][] {{8, 0}, {-8, 0}, {0, 8}, {0, -8}}) {
					relief += Math.abs(surface(level, here.getX() + o[0], here.getZ() + o[1]).getY() - here.getY());
				}
				if (relief > bestRelief && level.getBlockState(here.below()).getFluidState().isEmpty()) {
					bestRelief = relief;
					best = here;
				}
			}
		}
		return best;
	}

	private static BlockPos surface(ServerLevel level, int x, int z) {
		return level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, new BlockPos(x, 0, z));
	}

	/** A spot near spawn under open sky with level ground for a few blocks east, for the villager. */
	private static BlockPos openGround(ServerLevel level) {
		BlockPos spawn = level.getRespawnData().globalPos().pos();
		for (int r = 0; r <= 96; r += 4) {
			for (int dx = -r; dx <= r; dx += 4) {
				for (int dz = -r; dz <= r; dz += 4) {
					BlockPos here = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING, new BlockPos(spawn.getX() + dx, 0, spawn.getZ() + dz));
					boolean level4 = true;
					for (int i = 1; i <= 4 && level4; i++) {
						level4 = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING, here.offset(i, 0, 0)).getY() == here.getY();
					}
					if (level4 && level.getBlockState(here.below()).getFluidState().isEmpty()) {
						return here;
					}
				}
			}
		}
		return level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING, spawn);
	}
}
