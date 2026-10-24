package net.hoai2k.smoothcraft.gametest.mixin;

import com.mojang.renderpearl.backend.opengl.GlBackend;
import org.lwjgl.sdl.SDLVideo;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Test runs only: software OpenGL on a virtual X display (Xvfb + llvmpipe) has
 * no sRGB-capable framebuffers, so don't ask for one or no window opens.
 */
@Mixin(GlBackend.class)
abstract class GlBackendMixin {
	@Inject(method = "createWindow", at = @At(value = "INVOKE", target = "Lorg/lwjgl/sdl/SDLVideo;SDL_CreateWindow(Ljava/lang/CharSequence;IIJ)J"))
	private void smoothcraftTest$noSrgb(String title, int width, int height, long flags, CallbackInfoReturnable<Long> cir) {
		SDLVideo.SDL_GL_SetAttribute(22, 0);
	}
}
