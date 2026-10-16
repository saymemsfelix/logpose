import urllib.request
import urllib.parse
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("evolution_service")


def _clean_url(url: str) -> str:
    """Remove barras finais e garante scheme http/https."""
    cleaned = (url or "").strip().rstrip('/')
    if not cleaned:
        return ""
    if not cleaned.startswith("http://") and not cleaned.startswith("https://"):
        cleaned = "https://" + cleaned
    return cleaned


def fetch_instances(base_url: str, api_key: str) -> Dict[str, Any]:
    """Busca a lista de instâncias na Evolution API (GET /instance/fetchInstances)."""
    clean_base = _clean_url(base_url)
    if not clean_base or not api_key:
        return {"success": False, "error": "URL base ou chave de API não configurada."}

    endpoint = f"{clean_base}/instance/fetchInstances"
    headers = {
        "apikey": api_key.strip(),
        "Accept": "application/json",
    }

    req = urllib.request.Request(endpoint, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = resp.read().decode("utf-8")
            raw_data = json.loads(body)
            instances = []
            if isinstance(raw_data, list):
                for item in raw_data:
                    if not isinstance(item, dict):
                        continue
                    inst = item.get("instance") if isinstance(item.get("instance"), dict) else item
                    name = inst.get("instanceName") or inst.get("name") or item.get("name") or item.get("instanceName") or ""
                    status = inst.get("connectionStatus") or inst.get("status") or inst.get("state") or "unknown"
                    if isinstance(status, dict):
                        status = status.get("state") or str(status)
                    if name:
                        instances.append({
                            "instanceName": name,
                            "status": str(status),
                            "connectionStatus": str(status),
                        })
            return {"success": True, "instances": instances, "raw": raw_data}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"Evolution fetchInstances HTTP {e.code}: {error_body}")
        return {"success": False, "error": f"Erro HTTP {e.code}: {error_body}", "code": e.code}
    except Exception as e:
        logger.error(f"Evolution fetchInstances error: {str(e)}")
        return {"success": False, "error": str(e)}


def test_connection(base_url: str, api_key: str, instance_name: str) -> Dict[str, Any]:
    """Testa se a instância da Evolution API está conectada e online."""
    clean_base = _clean_url(base_url)
    if not clean_base or not api_key:
        return {"success": False, "error": "URL ou API Key não informados."}

    # Primeiro tenta verificar o status de conexão da instância específica
    if instance_name:
        endpoint = f"{clean_base}/instance/connectionState/{urllib.parse.quote(instance_name.strip())}"
        headers = {
            "apikey": api_key.strip(),
            "Accept": "application/json",
        }
        try:
            req = urllib.request.Request(endpoint, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                instance_info = data.get("instance", {}) if isinstance(data, dict) else {}
                state = instance_info.get("state") or data.get("state") or "unknown"
                is_connected = str(state).lower() in ["open", "connecting"]
                return {
                    "success": True,
                    "connected": is_connected,
                    "state": state,
                    "instanceName": instance_name,
                    "message": "Instância online e pronta para envio!" if is_connected else f"Instância em estado: {state}",
                }
        except Exception:
            # Fallback para fetch_instances
            pass

    # Fallback: listar instâncias e procurar a informada
    list_res = fetch_instances(base_url, api_key)
    if not list_res.get("success"):
        return list_res

    instances = list_res.get("instances", [])
    if not instances:
        return {"success": True, "connected": False, "message": "Nenhuma instância encontrada na Evolution API."}

    if instance_name:
        matched = next((i for i in instances if i.get("instanceName") == instance_name.strip()), None)
        if matched:
            status = matched.get("connectionStatus") or matched.get("status")
            is_connected = str(status).lower() in ["open", "connecting"]
            return {
                "success": True,
                "connected": is_connected,
                "state": status,
                "instanceName": instance_name,
                "message": "Instância conectada!" if is_connected else f"Instância em estado: {status}",
            }
        return {
            "success": True,
            "connected": False,
            "message": f"Instância '{instance_name}' não encontrada. Instâncias disponíveis: {[i.get('instanceName') for i in instances]}",
        }

    first = instances[0]
    return {
        "success": True,
        "connected": True,
        "state": first.get("status"),
        "instanceName": first.get("instanceName"),
        "message": f"Conexão com Evolution API ativa ({len(instances)} instância(s)).",
    }


def get_instance_qr_code(base_url: str, api_key: str, instance_name: str) -> Dict[str, Any]:
    """Obtém o QR Code em Base64 para conectar o WhatsApp (GET /instance/connect/{instance})."""
    clean_base = _clean_url(base_url)
    if not clean_base or not api_key or not instance_name:
        return {"success": False, "error": "Configurações incompletas (URL, chave ou instância ausente)."}

    endpoint = f"{clean_base}/instance/connect/{urllib.parse.quote(instance_name.strip())}"
    headers = {
        "apikey": api_key.strip(),
        "Accept": "application/json",
    }
    req = urllib.request.Request(endpoint, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            return {
                "success": True,
                "base64": data.get("base64"),
                "code": data.get("code"),
                "pairingCode": data.get("pairingCode"),
                "count": data.get("count", 0),
            }
    except Exception as e:
        logger.error(f"Evolution get_instance_qr_code error: {str(e)}")
        return {"success": False, "error": str(e)}


def send_text_message(
    base_url: str,
    api_key: str,
    instance_name: str,
    number: str,
    text: str,
) -> Dict[str, Any]:
    """Envia mensagem de texto via Evolution API (POST /message/sendText/{instance_name})."""
    clean_base = _clean_url(base_url)
    if not clean_base or not api_key or not instance_name:
        return {"success": False, "error": "Configuração da Evolution API incompleta (URL, API Key ou Instância ausente)."}

    clean_number = "".join(filter(str.isdigit, number or ""))
    if not clean_number:
        return {"success": False, "error": "Número de telefone inválido."}

    endpoint = f"{clean_base}/message/sendText/{urllib.parse.quote(instance_name.strip())}"
    headers = {
        "apikey": api_key.strip(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    payload = {
        "number": clean_number,
        "text": text,
    }

    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data_bytes, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            res_json = json.loads(body)
            # Extrair ID da mensagem se retornado
            key_info = res_json.get("key", {}) if isinstance(res_json, dict) else {}
            message_id = key_info.get("id") or res_json.get("messageId")
            return {"success": True, "data": res_json, "messageId": message_id}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"Evolution sendText HTTP {e.code}: {error_body}")
        return {"success": False, "error": f"HTTP {e.code}: {error_body}", "code": e.code}
    except Exception as e:
        logger.error(f"Evolution sendText error: {str(e)}")
        return {"success": False, "error": str(e)}


def send_media_message(
    base_url: str,
    api_key: str,
    instance_name: str,
    number: str,
    media_type: str,
    media_url: str,
    caption: str = "",
    file_name: str = "",
) -> Dict[str, Any]:
    """Envia mídia (imagem, áudio, vídeo, documento) via Evolution API POST /message/sendMedia/{instance}."""
    clean_base = _clean_url(base_url)
    if not clean_base or not api_key or not instance_name:
        return {"success": False, "error": "Configuração da Evolution API incompleta."}

    endpoint = f"{clean_base}/message/sendMedia/{urllib.parse.quote(instance_name.strip())}"
    headers = {
        "apikey": api_key.strip(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    clean_number = "".join(filter(str.isdigit, number or ""))
    mtype = (media_type or "image").lower()

    if mtype == "image":
        mimetype = "image/png" if file_name.endswith(".png") else "image/jpeg"
        final_filename = file_name or "imagem.jpg"
    elif mtype == "audio":
        mimetype = "audio/mpeg" if file_name.endswith(".mp3") else "audio/ogg"
        final_filename = file_name or "audio.mp3"
    elif mtype == "video":
        mimetype = "video/mp4"
        final_filename = file_name or "video.mp4"
    else:
        mimetype = "application/pdf" if file_name.endswith(".pdf") else "application/octet-stream"
        final_filename = file_name or "documento.pdf"

    payload = {
        "number": clean_number,
        "mediatype": mtype,
        "mimetype": mimetype,
        "media": media_url,
        "fileName": final_filename,
    }

    if mtype != "audio" and caption:
        payload["caption"] = caption

    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data_bytes, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            body = resp.read().decode("utf-8")
            res_json = json.loads(body)
            return {"success": True, "data": res_json}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"Evolution sendMedia HTTP {e.code}: {error_body}")
        return {"success": False, "error": f"HTTP {e.code}: {error_body}", "code": e.code}
    except Exception as e:
        logger.error(f"Evolution sendMedia error: {str(e)}")
        return {"success": False, "error": str(e)}


def send_whatsapp_message(
    base_url: str,
    api_key: str,
    instance_name: str,
    number: str,
    content: str,
    media_url: str = "",
    media_type: str = "text",
    file_name: str = "",
) -> Dict[str, Any]:
    """Despachante unificado para envio de WhatsApp via Evolution API."""
    if media_url and media_type != "text":
        return send_media_message(
            base_url=base_url,
            api_key=api_key,
            instance_name=instance_name,
            number=number,
            media_type=media_type,
            media_url=media_url,
            caption=content,
            file_name=file_name,
        )
    return send_text_message(
        base_url=base_url,
        api_key=api_key,
        instance_name=instance_name,
        number=number,
        text=content,
    )
