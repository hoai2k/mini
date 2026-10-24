package net.hoai2k.smoothcraft;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import net.fabricmc.loader.api.FabricLoader;

/** Player settings, kept in config/smoothcraft.json. */
public final class SmoothConfig {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	private static final Path FILE = FabricLoader.getInstance().getConfigDir().resolve("smoothcraft.json");
	private static SmoothConfig current = new SmoothConfig();
	/** Bumped on every change so caches built from the old settings rebuild. */
	private static volatile int version;

	/** Melt natural terrain into smooth surfaces. */
	public boolean smoothTerrain = true;
	/** 0 keeps the cubes, 1 is the full smooth surface. */
	public float terrainStrength = 1.0f;
	/** Each smoothed block face is cut into this many rows and columns. */
	public int terrainSubdivisions = 2;
	/** Sun, sky and torch light with physically based materials; off falls back to vanilla lighting. */
	public boolean realisticLighting = true;
	/** Round the boxes of every mob, player and block entity model. */
	public boolean roundEntities = true;
	/** Rounding radius as a fraction of each box's smallest half-extent. */
	public float entityRoundness = 0.8f;
	/** Largest rounding radius, in model pixels. */
	public float entityMaxRadius = 4.0f;
	/** Grid lines across each rounded edge band. */
	public int entityBands = 2;

	public static SmoothConfig get() {
		return current;
	}

	public static int version() {
		return version;
	}

	public static void load() {
		if (Files.exists(FILE)) {
			try (Reader reader = Files.newBufferedReader(FILE)) {
				SmoothConfig loaded = GSON.fromJson(reader, SmoothConfig.class);
				if (loaded != null) {
					current = loaded.clamped();
				}
			} catch (IOException | RuntimeException e) {
				Smoothcraft.LOG.warn("Could not read {}, using defaults", FILE, e);
			}
		}
		save();
		version++;
	}

	public static void save() {
		try (Writer writer = Files.newBufferedWriter(FILE)) {
			GSON.toJson(current, writer);
		} catch (IOException e) {
			Smoothcraft.LOG.warn("Could not write {}", FILE, e);
		}
	}

	public static void changed() {
		current = current.clamped();
		version++;
		save();
	}

	private SmoothConfig clamped() {
		terrainStrength = Math.max(0f, Math.min(1f, terrainStrength));
		terrainSubdivisions = Math.max(1, Math.min(4, terrainSubdivisions));
		entityRoundness = Math.max(0f, Math.min(1f, entityRoundness));
		entityMaxRadius = Math.max(0f, Math.min(16f, entityMaxRadius));
		entityBands = Math.max(1, Math.min(4, entityBands));
		return this;
	}
}
