import io
import tempfile
import os

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

# Graceful imports
try:
    import speech_recognition as sr
    SR_AVAILABLE = True
except ImportError:
    SR_AVAILABLE = False

try:
    import av
    AV_AVAILABLE = True
except ImportError:
    AV_AVAILABLE = False

router = APIRouter(prefix="/api/audio", tags=["audio"])


def convert_to_wav_bytes(audio_bytes: bytes, filename: str) -> bytes:
    """
    Uses PyAV to decode any audio format (m4a, aac, mp4, webm, etc.)
    and re-encodes to a PCM WAV (16 kHz, mono) suitable for SpeechRecognition.
    Falls back to returning raw bytes if PyAV is unavailable or conversion fails.
    """
    if not AV_AVAILABLE:
        return audio_bytes

    tmp_in_path = None
    tmp_out_path = None
    try:
        suffix = os.path.splitext(filename)[1] or ".audio"

        # Write incoming audio bytes to a temp input file
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name

        # Prepare a temp output path for the WAV
        fd, tmp_out_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

        # Transcode to 16 kHz mono PCM WAV using PyAV
        with av.open(tmp_in_path) as in_container:
            audio_stream = next(
                (s for s in in_container.streams if s.type == "audio"), None
            )
            if audio_stream is None:
                raise RuntimeError("No audio stream found in uploaded file.")

            resampler = av.AudioResampler(
                format="s16",
                layout="mono",
                rate=16000,
            )

            out_container = av.open(tmp_out_path, mode="w", format="wav")
            out_stream = out_container.add_stream("pcm_s16le", rate=16000)

            for frame in in_container.decode(audio_stream):
                frame.pts = None
                for resampled in resampler.resample(frame):
                    resampled.pts = None
                    for packet in out_stream.encode(resampled):
                        out_container.mux(packet)

            # Flush encoder
            for packet in out_stream.encode(None):
                out_container.mux(packet)

            out_container.close()

        # Read converted WAV bytes
        with open(tmp_out_path, "rb") as f:
            wav_bytes = f.read()

        return wav_bytes

    except Exception as e:
        # Gracefully fall back to raw bytes; SpeechRecognition will try its best
        print(f"[audio] PyAV conversion failed ({e}), falling back to raw bytes.")
        return audio_bytes
    finally:
        for path in [tmp_in_path, tmp_out_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = "en-IN"):
    """
    Accepts an audio file (any format supported by PyAV: m4a, aac, mp4, wav, webm, etc.)
    and returns the Google Speech Recognition transcription as plain text.

    Query params:
      - language: BCP-47 language tag for transcription (default: en-IN).
                  Supported: en-IN, hi-IN, te-IN
    """
    if not SR_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="SpeechRecognition library not installed on the server."
        )

    try:
        audio_bytes = await file.read()
        filename = file.filename or "recording.audio"

        wav_bytes = convert_to_wav_bytes(audio_bytes, filename)

        recognizer = sr.Recognizer()
        audio_file = io.BytesIO(wav_bytes)

        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)

        text = recognizer.recognize_google(audio_data, language=language)
        return JSONResponse(content={"transcription": text, "language": language})

    except sr.UnknownValueError:
        return JSONResponse(
            status_code=200,
            content={"transcription": "", "error": "Could not understand audio. Please speak clearly."}
        )
    except sr.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Google Speech Recognition API error: {e}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
