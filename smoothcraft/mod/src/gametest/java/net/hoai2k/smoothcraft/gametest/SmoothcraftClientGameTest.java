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
			BlockPos shore = world.getServer().computeOnServer(server -> shore(server.overworld()));
			BlockPos villager = open.offset(3, 0, 0);
			world.getServer().runCommand("summon villager " + villager.getX() + " " + villager.getY() + " " + villager.getZ()
					+ " {NoAI:1b,Rotation:[90f,0f]}");
			int eyeY = world.getServer().computeOnServer(server -> {
				int highest = ground.getY();
				for (int d = 0; d <= 14; d += 2) {
					highest = Math.max(highest, surface(server.overworld(), ground.getX() - d, ground.getZ() - d).getY());
				}
				return highest + 6;
			});
			// Each scene is photographed with Smoothcraft on, then again with it off.
			String[][] scenes = {
				{"villager", (open.getX() + 0.5) + " " + (open.getY() + 0.6) + " " + (open.getZ() + 0.5) + " -90 10"},
				{"villager-close", (open.getX() + 1.6) + " " + (open.getY() - 0.45) + " " + (open.getZ() - 0.4) + " -70 4"},
				{"terrain-noon", (ground.getX() - 14) + " " + eyeY + " " + (ground.getZ() - 14) + " -45 25"},
				{"shore", (shore.getX() - 7.5) + " " + (shore.getY() + 7) + " " + (shore.getZ() + 0.5) + " -90 40"},
				{"underwater", (shore.getX() - 9.5) + " " + (shore.getY() - 1.6) + " " + (shore.getZ() + 0.5) + " -90 30"},
			};
			for (String[] scene : scenes) {
				photograph(context, world, scene, "on");
			}
			if (Boolean.getBoolean("smoothcraft.textureReview") || Boolean.parseBoolean(System.getenv("SMOOTHCRAFT_TEXTURE_REVIEW"))) {
				photographEntityTextures(context, world, open);
			}
			world.getServer().runCommand("tp @p " + scenes[1][1]);
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
			for (String[] scene : scenes) {
				photograph(context, world, scene, "off");
			}

			context.runOnClient(client -> {
				SmoothConfig.get().smoothTerrain = true;
				SmoothConfig.get().roundEntities = true;
				SmoothConfig.get().realisticLighting = true;
				SmoothConfig.changed();
			});
		}
	}

	private static void photograph(ClientGameTestContext context, TestSingleplayerContext world, String[] scene, String state) {
		world.getServer().runCommand("tp @p " + scene[1]);
		world.getConnection().waitForChunksRender(20 * 60 * 6);
		context.waitTicks(40);
		context.takeScreenshot("smoothcraft-" + scene[0] + "-" + state);
	}

	/** Optional close views of varied UV layouts and dye layers for HD pack review. */
	private static void photographEntityTextures(ClientGameTestContext context, TestSingleplayerContext world, BlockPos origin) {
		String[] types = {"bee", "camel", "cow", "chicken", "frog", "pig", "sheep", "wolf", "creeper", "enderman", "iron_golem", "parrot", "blaze", "allay", "cat", "llama"};
		double[] heights = {.6, 2.375, 1.4, .7, .5, .9, 1.3, .85, 1.7, 2.9, 2.7, .9, 1.8, .6, .7, 1.87};
		for (int i = 0; i < types.length; i++) {
			// Keep the gallery above nearby hills and tree canopies so spectator
			// cameras cannot clip into the terrain as the row extends away.
			BlockPos position = origin.offset(12, 64, i * 5);
			world.getServer().runCommand("fill " + (position.getX() - 2) + " " + (position.getY() - 1) + " " + (position.getZ() - 2)
					+ " " + (position.getX() + 2) + " " + (position.getY() - 1) + " " + (position.getZ() + 2) + " smooth_stone");
			world.getServer().runCommand("summon " + types[i] + " " + position.getX() + " " + position.getY() + " " + position.getZ()
					+ " {NoAI:1b,NoGravity:1b,Invulnerable:1b,PersistenceRequired:1b,Rotation:[90f,0f]}");
			double distance = Math.max(1.4, heights[i] * 1.6);
			// tp positions the player's feet; account for the spectator eye height.
			String camera = (position.getX() - distance) + " " + (position.getY() + heights[i] * .65 - 1.62)
					+ " " + (position.getZ() - distance * .3) + " -73.3 0";
			photograph(context, world, new String[] {"texture-" + types[i], camera}, "on");
			if (types[i].equals("iron_golem")) {
				world.getServer().runCommand("data merge entity @e[type=iron_golem,limit=1] {Health:20f}");
				photograph(context, world, new String[] {"texture-iron-golem-damaged", camera}, "on");
			}
		}
	}

	/** Open water near spawn with dry land five blocks to the east: a shoreline to look at. */
	private static BlockPos shore(ServerLevel level) {
		BlockPos spawn = level.getRespawnData().globalPos().pos();
		for (int r = 0; r <= 160; r += 4) {
			for (int dx = -r; dx <= r; dx += 4) {
				for (int dz = -r; dz <= r; dz += 4) {
					if (Math.max(Math.abs(dx), Math.abs(dz)) != r) {
						continue;
					}
					BlockPos top = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING, new BlockPos(spawn.getX() + dx, 0, spawn.getZ() + dz));
					BlockPos land = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, top.offset(5, 0, 0));
					boolean water = !level.getBlockState(top.below()).getFluidState().isEmpty()
							&& !level.getBlockState(top.below(4)).getFluidState().isEmpty();
					boolean dry = level.getBlockState(land.below()).getFluidState().isEmpty() && Math.abs(land.getY() - top.getY()) <= 3;
					if (water && dry) {
						return top;
					}
				}
			}
		}
		return surface(level, spawn.getX(), spawn.getZ());
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
