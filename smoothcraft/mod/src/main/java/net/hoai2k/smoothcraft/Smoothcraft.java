package net.hoai2k.smoothcraft;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.model.loading.v1.ModelLoadingPlugin;
import net.fabricmc.fabric.api.resource.v1.ResourceLoader;
import net.fabricmc.fabric.api.resource.v1.pack.PackActivationType;
import net.fabricmc.loader.api.FabricLoader;
import net.hoai2k.smoothcraft.material.Materials;
import net.hoai2k.smoothcraft.terrain.BlockRules;
import net.hoai2k.smoothcraft.terrain.SmoothBlockModel;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.server.packs.PackType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class Smoothcraft implements ClientModInitializer {
	public static final String MOD_ID = "smoothcraft";
	public static final Logger LOG = LoggerFactory.getLogger(MOD_ID);

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(MOD_ID, path);
	}

	@Override
	public void onInitializeClient() {
		SmoothConfig.load();

		ModelLoadingPlugin.register(context -> context.modifyBlockModelAfterBake().register(
				(model, ctx) -> new SmoothBlockModel(model)));

		ResourceLoader resources = ResourceLoader.get(PackType.CLIENT_RESOURCES);
		resources.registerReloadListener(id("materials"), Materials.RELOADER);
		resources.registerReloadListener(id("block_rules"), BlockRules.RELOADER);
		FabricLoader.getInstance().getModContainer(MOD_ID).ifPresent(mod -> ResourceLoader.registerBuiltinPack(
				id("hd"), mod, Component.translatable("smoothcraft.pack.hd"), PackActivationType.DEFAULT_ENABLED));

		KeyMapping toggle = KeyMappingHelper.registerKeyMapping(new KeyMapping(
				"key.smoothcraft.toggle", InputConstants.Type.KEYBOARD, InputConstants.KEY_F8, KeyMapping.Category.MISC));
		ClientTickEvents.END_CLIENT_TICK.register(client -> {
			while (toggle.consumeClick()) {
				SmoothConfig config = SmoothConfig.get();
				config.smoothTerrain = !config.smoothTerrain;
				config.roundEntities = config.smoothTerrain;
				SmoothConfig.changed();
				rebuildWorld(client);
				if (client.player != null) {
					client.player.sendOverlayMessage(Component.translatable(
							config.smoothTerrain ? "smoothcraft.toggle.on" : "smoothcraft.toggle.off"));
				}
			}
		});
	}

	/** Re-mesh every loaded chunk, after a setting that changes terrain geometry. */
	public static void rebuildWorld(Minecraft client) {
		if (client.levelExtractor != null) {
			client.levelExtractor.allChanged();
		}
	}
}
