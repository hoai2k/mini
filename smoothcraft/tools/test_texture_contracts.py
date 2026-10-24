import io
import shutil
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

from check_textures import check_one, seam_metrics, scaled_metadata, visible_frame_count
from list_vanilla_textures import alpha_kind
from texture_batches import align_cutout_rgb, blend_with_mask, make_periodic


class TextureContractTests(unittest.TestCase):
    def test_scrolling_portal_material_requires_matching_edges(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            texture_id = 'entity/end_portal/end_portal'
            target = root / (texture_id + '.png')
            target.parent.mkdir(parents=True)
            image = Image.new('RGBA', (4, 4), (100, 100, 100, 255))
            image.putpixel((0, 1), (200, 100, 100, 255))
            image.save(target)
            req = {'id': texture_id, 'size': [4, 4], 'frames': 1, 'alpha': 'opaque'}
            result = check_one(req, root, root)
            self.assertIn('opposing RGB edges do not match on x axis', result['errors'])
            image.putpixel((3, 1), (200, 100, 100, 255))
            image.save(target)
            self.assertEqual(check_one(req, root, root)['state'], 'structurally-valid')

    @unittest.skipUnless(shutil.which('magick'), 'ImageMagick is required')
    def test_complex_uv_net_keeps_coordinates_despite_neighbouring_sliver(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            reference = Image.new('RGBA', (8, 8), (0, 0, 0, 0))
            raw = Image.new('RGB', (16, 16), (0, 0, 0))
            for box in ((0, 0, 2, 2), (4, 0, 6, 2), (0, 4, 2, 6)):
                reference.paste((255, 255, 255, 255), box)
                raw.paste((70, 160, 210), box)
            raw.paste((50, 210, 40), (0, 15, 16, 16))
            reference.save(root / 'reference.png')
            raw.save(root / 'raw.png')
            align_cutout_rgb(root / 'raw.png', root / 'reference.png', root / 'out.png')
            with Image.open(root / 'out.png') as image:
                np.testing.assert_array_equal(np.array(image.convert('RGB')), np.array(raw)[:8, :8])

    @unittest.skipUnless(shutil.which('magick'), 'ImageMagick is required')
    def test_small_cutout_registers_before_cropping_and_excludes_neighbour(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            reference = Image.new('RGBA', (8, 8), (0, 0, 0, 0))
            reference.paste((255, 255, 255, 255), (0, 0, 4, 4))
            reference.save(root / 'reference.png')
            generated = Image.new('RGB', (16, 16), (0, 0, 0))
            generated.paste((70, 160, 210), (8, 5, 14, 11))
            generated.paste((200, 50, 30), (2, 15, 14, 16))
            generated.save(root / 'raw.png')
            align_cutout_rgb(root / 'raw.png', root / 'reference.png', root / 'out.png')
            with Image.open(root / 'out.png') as image:
                image = image.convert('RGB')
                self.assertEqual(image.size, (8, 8))
                self.assertEqual(image.getpixel((1, 1)), (70, 160, 210))
                self.assertEqual(image.getpixel((6, 6)), (0, 0, 0))

    def test_hidden_rgb_noise_does_not_count_as_animation(self):
        pixels = np.full((4, 2, 4), 255, dtype=np.uint8)
        pixels[:, 0, 3] = 0
        pixels[2:, 0, :3] = 0
        self.assertEqual(visible_frame_count(pixels, 2), 1)
        pixels[2:, 1, :3] = 50
        self.assertEqual(visible_frame_count(pixels, 2), 2)

    def test_conduit_frame_height_scales_without_changing_playback(self):
        req = {'id': 'entity/conduit/wind', 'vanilla_size': [64, 704], 'size': [128, 1408]}
        metadata = {'animation': {'height': 32, 'frametime': 3, 'frames': [0, 2, 1]}}
        result = scaled_metadata(req, metadata)
        self.assertEqual(result['animation'], {'height': 64, 'frametime': 3, 'frames': [0, 2, 1]})
        self.assertEqual(req['size'][1] // result['animation']['height'], 22)
        self.assertEqual(metadata['animation']['height'], 32)

    @unittest.skipUnless(shutil.which('magick'), 'ImageMagick is required for texture preparation')
    def test_opaque_mask_alpha_does_not_overwrite_unselected_pixels(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            Image.new('RGB', (2, 2), (0, 0, 255)).save(root / 'base.png')
            Image.new('RGB', (2, 2), (255, 0, 0)).save(root / 'patch.png')
            mask = Image.new('RGBA', (2, 2), (0, 0, 0, 255))
            mask.putpixel((1, 1), (255, 255, 255, 255))
            mask.save(root / 'mask.png')
            blend_with_mask(root / 'base.png', root / 'patch.png', root / 'mask.png', root / 'out.png')
            with Image.open(root / 'out.png') as image:
                rgb = image.convert('RGB')
                self.assertEqual(rgb.getpixel((0, 0)), (0, 0, 255))
                self.assertEqual(rgb.getpixel((1, 1)), (255, 0, 0))

    @unittest.skipUnless(shutil.which('magick'), 'ImageMagick is required for texture preparation')
    def test_periodic_edges_match_without_a_boundary_brightness_band(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'texture.png'
            y, x = np.indices((32, 32))
            original = np.stack((x * 7, y * 7, (x + y) * 3), axis=-1).astype(np.uint8)
            Image.fromarray(original).save(path)
            make_periodic(path, 'xy')
            with Image.open(path) as image:
                result = np.array(image.convert('RGB')).astype(int)
            self.assertLessEqual(np.abs(result[:, 0] - result[:, -1]).max(), 1)
            self.assertLessEqual(np.abs(result[0] - result[-1]).max(), 1)
            self.assertLess(float(result[..., 0].std()), 10)
            self.assertLess(abs(float(result[..., 0].mean()) - float(original[..., 0].mean())), 1)

    @unittest.skipUnless(shutil.which('magick') and shutil.which('c++'), 'ImageMagick and C++ are required')
    def test_already_periodic_detail_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'texture.png'
            original = np.full((32, 32, 3), 90, dtype=np.uint8)
            original[12:20, 12:20] = (180, 40, 60)
            original[15, 15] = (20, 230, 110)
            Image.fromarray(original).save(path)
            make_periodic(path, 'xy')
            with Image.open(path) as image:
                np.testing.assert_array_equal(np.array(image.convert('RGB')), original)

    def test_rgb_png_colour_key_is_cutout(self):
        image = Image.new('RGB', (2, 1), (255, 0, 255))
        image.putpixel((1, 0), (80, 100, 60))
        data = io.BytesIO()
        image.save(data, format='PNG', transparency=(255, 0, 255))
        data.seek(0)
        with Image.open(data) as decoded:
            self.assertEqual(decoded.mode, 'RGB')
            self.assertEqual(alpha_kind(decoded), 'cutout')

    def test_greyscale_png_colour_key_is_cutout(self):
        image = Image.new('L', (2, 1), 0)
        image.putpixel((1, 0), 200)
        data = io.BytesIO()
        image.save(data, format='PNG', transparency=0)
        data.seek(0)
        with Image.open(data) as decoded:
            self.assertEqual(alpha_kind(decoded), 'cutout')

    def test_partial_alpha_is_translucent(self):
        self.assertEqual(alpha_kind(Image.new('RGBA', (2, 2), (120, 140, 160, 128))), 'translucent')

    def test_horizontal_ramp_exposes_wrap_discontinuity(self):
        pixels = np.full((16, 16, 4), 255, dtype=np.uint8)
        pixels[..., :3] = np.arange(16, dtype=np.uint8)[None, :, None] * 16
        seams = seam_metrics(pixels)
        self.assertGreater(seams['x']['ratio'], 10)
        self.assertEqual(seams['y']['wrap_mean'], 0)

    def test_transparency_seam_is_reported_even_with_flat_rgb(self):
        pixels = np.full((16, 16, 4), 255, dtype=np.uint8)
        pixels[:, -1, 3] = 0
        seams = seam_metrics(pixels)
        self.assertEqual(seams['x']['alpha_mismatch_pixels'], 16)


if __name__ == '__main__':
    unittest.main()
