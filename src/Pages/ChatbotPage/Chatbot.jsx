import { useState, useRef, useEffect } from 'react';
import { Container, Paper, Textarea, ActionIcon, ScrollArea, Text, Group, Loader, ThemeIcon, Button } from '@mantine/core';
import { IconSend, IconUser, IconRobot, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import './Chatbot.css';

const API_URL = import.meta.env.VITE_API_CHATBOT_URL || 'http://127.0.0.1:8000';

const ChatbotPage = () => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: '¡Hola! Soy un asistente que genera consultas SPARQL. ¿En qué te puedo ayudar?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleRunInQueries = (query) => {
    const searchParams = new URLSearchParams();
    searchParams.set("action", "new");
    searchParams.set("code", query);

    window.open(`/queries?${searchParams.toString()}`, '_blank');
  };

  const handleReset = () => {
    setMessages([
      { role: 'bot', text: '¡Hola! Soy un asistente que genera consultas SPARQL. ¿En qué te puedo ayudar?' }
    ]);
  };

  const enviarPregunta = async () => {
    if (!inputText.trim()) return;

    const textoDelUsuario = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: textoDelUsuario }]);
    setIsLoading(true);

    const history = messages.slice(1).map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.text
    }));

    try {
        const response = await fetch(`${API_URL}/api/generate-sparql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_text: textoDelUsuario, history })
        });

        const data = await response.json();
        console.log("SPARQL Generado:", data.sparql_result);
        
        setMessages(prev => [...prev, { role: 'bot', text: data.sparql_result || "No se recibió ninguna consulta SPARQL válida de la API." }]);
    } catch (error) {
        console.error("Error conectando con la API interna:", error);
        setMessages(prev => [...prev, { role: 'bot', text: "Hubo un error al conectar con la API. Asegúrate de que el servidor backend esté encendido en http://127.0.0.1:8000.\n\n" + String(error) }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="chatbotRoot">
        <Container size="xl" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
            <Paper shadow="xl" radius="lg" p="xl" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#252525', border: '1px solid rgba(255, 255, 255, 0.08)', minHeight: 0 }}>
                <Group justify="space-between" align="center" mb="lg">
                    <Text size="xl" fw={800} variant="gradient" gradient={{ from: 'rgba(147, 197, 253, 1)', to: 'rgba(59, 130, 246, 1)', deg: 45 }}>
                        Generador de Consultas SPARQL
                    </Text>
                    <Button 
                        variant="filled" 
                        color="blue" 
                        size="sm" 
                        radius="md"
                        leftSection={<IconPlus size="1rem" />} 
                        onClick={handleReset}
                        style={{ 
                            color: '#ffffff',
                            opacity: messages.length <= 1 ? 0.5 : 1,
                            pointerEvents: messages.length <= 1 ? 'none' : 'auto'
                        }}
                    >
                        Nueva Consulta
                    </Button>
                </Group>
                
                <ScrollArea viewportRef={scrollRef} style={{ flexGrow: 1, paddingRight: '1rem', marginBottom: '1rem', minHeight: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {messages.map((msg, idx) => (
                            <Group key={idx} align="flex-start" wrap="nowrap" style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                <ThemeIcon size="xl" radius="xl" variant={msg.role === 'user' ? 'filled' : 'light'} color={msg.role === 'user' ? 'blue' : 'gray'}>
                                    {msg.role === 'user' ? <IconUser size="1.4rem" /> : <IconRobot size="1.4rem" />}
                                </ThemeIcon>
                                <Paper 
                                    p="md" 
                                    radius="md" 
                                    style={{ 
                                        maxWidth: '85%', 
                                        borderBottomRightRadius: msg.role === 'user' ? 4 : 'var(--mantine-radius-md)', 
                                        borderBottomLeftRadius: msg.role === 'bot' ? 4 : 'var(--mantine-radius-md)',
                                        background: msg.role === 'user' ? 'rgba(59, 130, 246, 0.2)' : '#1a1a1a',
                                        border: msg.role === 'user' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#eaeaea'
                                    }}
                                >
                                    {msg.role === 'bot' && idx > 0 && !msg.text.startsWith("Hubo un error") && msg.text.includes("SELECT") ? (
                                        <>
                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', color: '#a5d6ff' }}>{msg.text}</pre>
                                            <Group justify="flex-end" mt="sm">
                                                <Button 
                                                    size="xs" 
                                                    variant="light" 
                                                    color="blue" 
                                                    leftSection={<IconPlayerPlay size="1rem" />}
                                                    onClick={() => handleRunInQueries(msg.text)}
                                                >
                                                    Ejecutar en Queries
                                                </Button>
                                            </Group>
                                        </>
                                    ) : (
                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Text>
                                    )}
                                </Paper>
                            </Group>
                        ))}
                        {isLoading && (
                            <Group align="flex-start" wrap="nowrap">
                                <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                                    <IconRobot size="1.4rem" />
                                </ThemeIcon>
                                <Paper p="md" radius="md" style={{ borderBottomLeftRadius: 4, background: '#1a1a1a', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <Loader size="sm" type="dots" color="rgba(255, 255, 255, 0.5)" />
                                </Paper>
                            </Group>
                        )}
                    </div>
                </ScrollArea>

                <form onSubmit={(e) => { e.preventDefault(); enviarPregunta(); }} style={{ position: 'relative', marginTop: '1rem' }}>
                    <Textarea
                        placeholder="Escribe qué consulta SPARQL quieres generar..."
                        value={inputText}
                        onChange={(e) => setInputText(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                enviarPregunta();
                            }
                        }}
                        disabled={isLoading}
                        style={{ flexGrow: 1 }}
                        size="md"
                        radius="xl"
                        autosize
                        minRows={1}
                        maxRows={5}
                        autoComplete="off"
                        name="chat-input-field"
                        styles={{ 
                            input: { 
                                paddingLeft: '1.5rem',
                                paddingRight: '3.5rem',
                                background: '#1a1a1a',
                                color: '#eaeaea',
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                paddingTop: '13px'
                            } 
                        }}
                    />
                    <ActionIcon 
                        type="submit" 
                        size="lg" 
                        radius="xl" 
                        variant="filled"
                        color="blue"
                        style={{ 
                            position: 'absolute', 
                            bottom: '5px', 
                            right: '6px',
                            width: 38, 
                            height: 38,
                            opacity: (isLoading || !inputText.trim()) ? 0.5 : 1,
                            pointerEvents: (isLoading || !inputText.trim()) ? 'none' : 'auto'
                        }}
                    >
                        <IconSend 
                            size="1.4rem" 
                            stroke={1.5} 
                            color="#ffffff" 
                        />
                    </ActionIcon>
                </form>
            </Paper>
        </Container>
    </div>
  );
};

export default ChatbotPage;

