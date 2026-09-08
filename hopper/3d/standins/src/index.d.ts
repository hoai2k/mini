/** Type surface of the stand-in library for the TypeScript game code. */
import type { DataTexture, FogExp2, Group, Mesh, Object3D, Vector3, Box3 } from 'three';

export interface Region {
  id: string;
  name: string;
  mission: number;
  gravity: number;
  sky: string;
  haze: string;
  accent: string;
  ground: string;
  sun: string;
  enemies: string[];
  landmark: string;
}
export interface TerrainOptions {
  size?: number;
  segments?: number;
  seed?: number;
  relief?: number;
  plateaus?: { x: number; z: number; r: number; y: number }[];
  valley?: { axis: 'x' | 'z'; at: number; width: number; depth: number } | null;
}
export interface HorizonOptions {
  radius?: number;
  peaks?: number;
  seed?: number;
  height?: number;
  gap?: { angle: number; width: number } | null;
}
export interface StandInMeta {
  id: string;
  kind: string;
  rig?: string;
  size?: [number, number, number];
  region?: string;
  [key: string]: unknown;
}
export interface Landing {
  y: number;
  halfX: number;
  halfZ: number;
  x: number;
  z: number;
  label: string;
}
export type StandInObject = Group & {
  userData: { standIn: StandInMeta; landings?: Landing[]; animate?: (t: number) => void; lit?: (on: boolean) => void };
};
export type TerrainMesh = Mesh & { userData: { standIn: StandInMeta; heightAt: (x: number, z: number) => number } };

export const REGIONS: Region[];
export function regionById(id: string): Region;
export function listStandIns(): string[];
export function hasStandIn(id: string): boolean;
export function createStandIn(id: string, options?: Record<string, unknown>): StandInObject;
export function makeHeightField(options?: TerrainOptions): (x: number, z: number) => number;
export function makeTerrain(region: Region, options?: TerrainOptions): TerrainMesh;
export function makeHorizon(region: Region, options?: HorizonOptions): Group;
export function makeSkyDome(region: Region, options?: { radius?: number }): Mesh;
export function makeLandmark(region: Region, options?: { distance?: number }): Group;
export function makeFog(region: Region, density?: number): FogExp2;
export function makeHopperProxy(options?: { rider?: boolean }): StandInObject;
export function makeTexture(name: string, options?: { size?: number; seed?: number; base?: string; repeat?: number }): DataTexture;
export function makeSkyTexture(region: Region, options?: { width?: number; height?: number; seed?: number }): DataTexture;
export function measure(object: Object3D): { box: Box3; size: Vector3 };
export function socketNames(object: Object3D): string[];
export const HOPPER_SOCKETS: Record<string, [number, number, number]>;
export const RIDER_SOCKETS: Record<string, [number, number, number]>;
export const HOPPER_CLIPS: string[];
export const HOPPER_HEIGHT_M: number;
export const TEXTURE_NAMES: string[];
export const HOPPER: Record<string, string>;
export const SHADOW: Record<string, string>;
export const SURFACE: Record<string, string>;
