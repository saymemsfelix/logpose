import { useState, useRef, useEffect, useCallback } from "react";
import {
  RiSendPlaneFill,
  RiMicLine,
  RiCloseLine,
  RiStopCircleLine,
  RiLoader4Line,
} from "@remixicon/react";
import { geminiTranscribeAudio } from "@/services/integrations";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

// Suporte a TypeScript para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const speechTextRef = useRef<string>("");
  const autoSendOnFinishRef = useRef<boolean>(false);

  // Ajusta altura do textarea dinamicamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [text]);

  // Limpa streams ao desmontar o componente
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    if (isLoading || isTranscribing) return;

    try {
      // 1. Solicita permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      speechTextRef.current = "";
      autoSendOnFinishRef.current = false;
      setRecordingSeconds(0);
      setIsRecording(true);

      // Inicia contador de tempo
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // 2. Tenta iniciar reconhecimento de fala nativo (Web Speech API) para transcrição em tempo real
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.lang = "pt-BR";
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let finalTranscript = "";
            let interimTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
              } else {
                interimTranscript += transcript;
              }
            }
            const fullTranscript = (finalTranscript + interimTranscript).trim();
            if (fullTranscript) {
              speechTextRef.current = fullTranscript;
              setText(fullTranscript);
            }
          };

          recognition.onerror = (err: any) => {
            console.warn("Aviso no Web Speech API (fallback para Gemini):", err);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (speechErr) {
          console.warn("Não foi possível iniciar Web Speech API:", speechErr);
        }
      }

      // 3. Em paralelo, grava o áudio com MediaRecorder para fallback 100% garantido com Gemini
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const autoSend = autoSendOnFinishRef.current;
        const currentSpeechText = speechTextRef.current.trim();

        // Se a transcrição nativa funcionou perfeitamente
        if (currentSpeechText) {
          setIsTranscribing(false);
          if (autoSend) {
            onSend(currentSpeechText);
            setText("");
          }
          return;
        }

        // Se não pegou fala nativa, envia o áudio gravado para o Gemini transcrever com IA
        if (audioChunksRef.current.length > 0) {
          setIsTranscribing(true);
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              try {
                const res = await geminiTranscribeAudio(base64Audio, mimeType);
                const transcribed = (res.text || "").trim();
                setIsTranscribing(false);

                if (transcribed) {
                  setText(transcribed);
                  if (autoSend) {
                    onSend(transcribed);
                    setText("");
                  }
                } else {
                  toast.info("Não identificamos sua fala. Tente falar mais perto do microfone.");
                }
              } catch (transcribeErr: any) {
                console.error("Erro na transcrição Gemini:", transcribeErr);
                setIsTranscribing(false);
                toast.error("Erro ao transcrever áudio com IA.");
              }
            };
          } catch (err) {
            setIsTranscribing(false);
            toast.error("Erro ao processar áudio gravado.");
          }
        } else {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250);
    } catch (err: any) {
      console.error("Erro ao acessar microfone:", err);
      cleanupAudio();
      setIsRecording(false);
      toast.error("Acesso ao microfone negado ou não suportado pelo navegador.");
    }
  };

  const handleStopRecording = useCallback((autoSend: boolean = false) => {
    autoSendOnFinishRef.current = autoSend;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const handleCancelRecording = () => {
    cleanupAudio();
    setIsRecording(false);
    setIsTranscribing(false);
    audioChunksRef.current = [];
    speechTextRef.current = "";
    setText("");
    toast.info("Gravação de áudio cancelada.");
  };

  const handleSubmit = () => {
    if (!text.trim() || isLoading || isTranscribing) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-t border-border/40 px-3 py-2.5 bg-card">
      {/* Estado 1: Transcrevendo com IA */}
      {isTranscribing ? (
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <RiLoader4Line className="size-4 animate-spin text-emerald-400" />
            <span className="font-medium">O Ninja AI está ouvindo e transcrevendo seu áudio...</span>
          </div>
        </div>
      ) : isRecording ? (
        /* Estado 2: Gravando Áudio Ativo */
        <div className="flex items-center justify-between gap-2 py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/25">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="relative flex size-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-mono font-semibold text-red-400 shrink-0">
              {formatTime(recordingSeconds)}
            </span>
            {/* Visualizador de ondas sonoras */}
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="w-0.5 h-3 bg-red-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]"></span>
              <span className="w-0.5 h-4 bg-red-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.1s]"></span>
              <span className="w-0.5 h-5 bg-red-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.2s]"></span>
              <span className="w-0.5 h-3 bg-red-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.15s]"></span>
            </div>
            {/* Preview do texto ao vivo ou instrução */}
            <span className="text-xs text-muted-foreground truncate italic">
              {text.trim() ? text : "Fale agora com o Ninja AI..."}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão Cancelar */}
            <button
              onClick={handleCancelRecording}
              className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
              title="Cancelar gravação"
            >
              <RiCloseLine className="size-4" />
            </button>

            {/* Botão Parar e Revisar */}
            <button
              onClick={() => handleStopRecording(false)}
              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1 transition-colors"
              title="Parar e revisar texto"
            >
              <RiStopCircleLine className="size-4 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">Parar</span>
            </button>

            {/* Botão Enviar Direto */}
            <button
              onClick={() => handleStopRecording(true)}
              className="p-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-medium flex items-center gap-1 transition-colors shadow-sm"
              title="Finalizar e Enviar para o Ninja AI"
            >
              <RiSendPlaneFill className="size-3.5" />
              <span className="text-[11px] font-semibold">Enviar</span>
            </button>
          </div>
        </div>
      ) : (
        /* Estado 3: Digitação Normal + Botão de Microfone */
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre campanhas ou envie áudio..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] placeholder:text-muted-foreground/60 focus:outline-none max-h-[100px] overflow-auto py-1"
          />

          {/* Botão de Gravação de Áudio por Voz */}
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isLoading}
            className="shrink-0 rounded-lg p-2 bg-muted/70 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group"
            title="Gravar mensagem por áudio (Voz para o Ninja AI)"
          >
            <RiMicLine className="size-4 group-hover:scale-110 transition-transform" />
          </button>

          {/* Botão Enviar Mensagem */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
            className="shrink-0 rounded-lg p-2 bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            title="Enviar mensagem"
          >
            <RiSendPlaneFill className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
