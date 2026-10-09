import asyncio
import io
import logging
from PIL import Image, ImageDraw
from integrations.meta_ads.client import GRAPH_API_BASE
import httpx

logger = logging.getLogger(__name__)

# Timeout longo para upload de vídeos grandes
UPLOAD_TIMEOUT = 180.0


async def upload_image(
    access_token: str,
    account_id: str,
    file_bytes: bytes,
    filename: str,
) -> dict:
    """
    Faz upload de uma imagem para a conta de anúncio.
    Retorna {"success": True, "image_hash": "..."} ou erro.
    """
    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    url = f"{GRAPH_API_BASE}/{act_id}/adimages"

    async with httpx.AsyncClient(timeout=UPLOAD_TIMEOUT) as http:
        response = await http.post(
            url,
            data={"access_token": access_token},
            files={"filename": (filename, file_bytes)},
        )

        if response.status_code == 200:
            result = response.json()
            images = result.get("images", {})
            for key, image_data in images.items():
                image_hash = image_data.get("hash")
                if image_hash:
                    logger.info(f"Imagem uploaded: {filename} → hash={image_hash}")
                    return {"success": True, "image_hash": image_hash}

            logger.error(f"Upload imagem {filename}: status 200 mas sem hash. Response: {result}")
            return {"success": False, "error": "Upload retornou 200 mas sem image hash"}

        error_msg = _parse_error(response)
        logger.error(f"Erro upload imagem {filename}: {error_msg}")
        return {"success": False, "error": error_msg}


async def _ensure_fallback_image_hash(access_token: str, act_id: str, video_id: str) -> str | None:
    """Gera e envia uma thumbnail válida em caso de emergência para a Meta nunca rejeitar o criativo."""
    try:
        img = Image.new("RGB", (1080, 1080), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)
        cx, cy, r = 540, 540, 60
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(30, 41, 59))
        draw.polygon([(cx - 15, cy - 25), (cx - 15, cy + 25), (cx + 25, cy)], fill=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        up_img = await upload_image(
            access_token=access_token,
            account_id=act_id,
            file_bytes=buf.getvalue(),
            filename=f"thumb_fallback_{video_id}.jpg",
        )
        if up_img.get("success"):
            return up_img.get("image_hash")
    except Exception as e:
        logger.error(f"Erro ao gerar thumbnail de fallback para vídeo {video_id}: {e}")
    return None


async def wait_video_ready(
    access_token: str,
    account_id: str,
    video_id: str,
    max_wait_seconds: int = 180,
    poll_interval: float = 3.0,
) -> dict:
    """
    Aguarda a Meta Marketing API transcodificar o vídeo (video_status == 'ready').
    Extrai thumbnail da Meta e faz upload para /adimages garantindo image_hash permanente.
    Retorna {"success": True, "video_id": ..., "image_hash": ..., "image_url": ...}.
    """
    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    url = f"{GRAPH_API_BASE}/{video_id}"
    elapsed = 0.0

    logger.info(f"Aguardando processamento e codificação do vídeo {video_id} na Meta...")

    last_v_status = ""
    while elapsed < max_wait_seconds:
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

        try:
            async with httpx.AsyncClient(timeout=15.0) as http:
                resp = await http.get(
                    url,
                    params={
                        "access_token": access_token,
                        "fields": "status,picture,thumbnails",
                    },
                )

            if resp.status_code == 200:
                data = resp.json()
                status_data = data.get("status")

                v_status = ""
                proc_phase_status = ""
                if isinstance(status_data, dict):
                    v_status = str(status_data.get("video_status", "")).lower()
                    proc_phase = status_data.get("processing_phase", {})
                    if isinstance(proc_phase, dict):
                        proc_phase_status = str(proc_phase.get("status", "")).lower()
                elif isinstance(status_data, str):
                    v_status = status_data.lower()

                last_v_status = v_status
                logger.info(f"Vídeo {video_id} na Meta ({elapsed:.1f}s) — status: '{v_status}', processamento: '{proc_phase_status}'")

                if v_status in ("error", "failed"):
                    err_detail = status_data if isinstance(status_data, dict) else v_status
                    return {"success": False, "error": f"Erro de processamento do vídeo na Meta: {err_detail}"}

                # Verifica se vídeo está pronto
                is_ready = (v_status == "ready") or (proc_phase_status == "complete")

                picture_url = data.get("picture")
                if not picture_url:
                    thumbs = data.get("thumbnails", {}).get("data", [])
                    if thumbs:
                        picture_url = thumbs[0].get("uri")

                # Se a Meta não expõe status detalhado mas picture_url já existe após 10s
                if not is_ready and not status_data and picture_url and elapsed >= 10.0:
                    is_ready = True

                if is_ready:
                    logger.info(f"Vídeo {video_id} PRONTO na Meta ({elapsed:.1f}s)! Processando thumbnail...")

                    image_hash = None
                    if picture_url:
                        # Baixa o thumbnail gerado pela Meta e envia para /adimages
                        try:
                            headers = {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            }
                            async with httpx.AsyncClient(timeout=25.0, headers=headers) as img_client:
                                img_res = await img_client.get(picture_url)
                                if img_res.status_code == 200 and img_res.content:
                                    up_img = await upload_image(
                                        access_token=access_token,
                                        account_id=act_id,
                                        file_bytes=img_res.content,
                                        filename=f"thumb_{video_id}.jpg",
                                    )
                                    if up_img.get("success"):
                                        image_hash = up_img.get("image_hash")
                                        logger.info(f"Thumbnail da Meta salvo no adimages com sucesso: hash={image_hash}")
                        except Exception as e:
                            logger.warning(f"Erro ao baixar/salvar thumbnail em adimages: {e}")

                    # Se não obteve image_hash a partir da picture_url, gera fallback garantido
                    if not image_hash:
                        logger.info(f"Gerando fallback_image_hash para vídeo {video_id}...")
                        image_hash = await _ensure_fallback_image_hash(access_token, act_id, video_id)

                    return {
                        "success": True,
                        "video_id": video_id,
                        "image_hash": image_hash,
                        "image_url": picture_url if not image_hash else None,
                    }

        except Exception as e:
            logger.warning(f"Checagem de status do vídeo {video_id} falhou ({e}), tentando novamente...")

    # Se atingiu o tempo limite e ainda está expressamente em processing
    if last_v_status == "processing":
        return {
            "success": False,
            "error": f"O vídeo {video_id} ainda está sendo processado pela Meta (tempo limite de {max_wait_seconds}s excedido). Aguarde cerca de 1 minuto e tente novamente."
        }

    # Timeout geral com status incerto: tenta prosseguir com fallback
    logger.warning(f"Vídeo {video_id} tempo limite ({max_wait_seconds}s). Tentando prosseguir com thumbnail fallback.")
    fallback_hash = await _ensure_fallback_image_hash(access_token, act_id, video_id)
    return {
        "success": True,
        "video_id": video_id,
        "image_hash": fallback_hash,
        "image_url": None,
    }


async def upload_video(
    access_token: str,
    account_id: str,
    file_bytes: bytes,
    filename: str,
) -> dict:
    """
    Faz upload de um vídeo para a conta de anúncio e aguarda ficar pronto.
    Retorna {"success": True, "video_id": "...", "image_hash": "...", "image_url": "..."} ou erro.
    """
    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    url = f"{GRAPH_API_BASE}/{act_id}/advideos"

    logger.info(f"Enviando arquivo de vídeo {filename} ({len(file_bytes)} bytes) para Meta...")
    async with httpx.AsyncClient(timeout=UPLOAD_TIMEOUT) as http:
        response = await http.post(
            url,
            data={"access_token": access_token},
            files={"source": (filename, file_bytes)},
        )

        if response.status_code == 200:
            result = response.json()
            video_id = result.get("id")
            if video_id:
                logger.info(f"Vídeo uploaded: {filename} → id={video_id}. Aguardando Meta transcodificar...")
                return await wait_video_ready(access_token, act_id, video_id)

        error_msg = _parse_error(response)
        logger.error(f"Erro upload vídeo {filename}: {error_msg}")
        return {"success": False, "error": error_msg}


def _parse_error(response: httpx.Response) -> str:
    """Parseia mensagem de erro da Meta API."""
    try:
        body = response.json()
        return body.get("error", {}).get("message", f"Erro {response.status_code}")
    except Exception:
        return f"Erro {response.status_code} da Meta API"

