# Bookzam's reading models

On-device text reading, run in the browser with ONNX Runtime Web
(`../vendor/ort/`, MIT licence).

| File | Model | Source | Licence |
| --- | --- | --- | --- |
| `det.onnx` | PP-OCRv5 mobile text detection | [PaddlePaddle/PP-OCRv5_mobile_det_onnx](https://huggingface.co/PaddlePaddle/PP-OCRv5_mobile_det_onnx) (`inference.onnx`) | Apache-2.0 |
| `rec.onnx`, `dict.txt` | PP-OCRv5 mobile English text recognition and its character list | [monkt/paddleocr-onnx](https://huggingface.co/monkt/paddleocr-onnx) (`languages/english/`), converted from PaddleOCR | Apache-2.0 |

Both models come from [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
(Copyright PaddlePaddle Authors, Apache License 2.0,
http://www.apache.org/licenses/LICENSE-2.0). They are used unmodified.

How they are fed is in `../src/ocr/core.js`: the detector takes BGR with
ImageNet mean and standard deviation, the recogniser 48-pixel-high crops in
[-1, 1].
