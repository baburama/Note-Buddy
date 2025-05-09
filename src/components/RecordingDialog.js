import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { Mic, StopCircle, Save, Delete } from 'lucide-react';
import MicSvg from '../assets/mic-sound-record-voice-svgrepo-com.svg';
import { useAuth } from '../context/AuthContext';

const RecordingDialog = ({
  open,
  onClose,
  openNotesDialog,
  baseUrl = 'https://note-buddy-backend.onrender.com',
  onNoteAdded = () => {},
}) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('recording'); // recording, review, summary
  const [transcriptionStatus, setTranscriptionStatus] = useState(''); // Status message during transcription
  const [transcriptionId, setTranscriptionId] = useState(''); // To track the AssemblyAI job
  const [retryAttempt, setRetryAttempt] = useState(0); // Track retry attempts
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  
  // Get auth context
  const { authFetch } = useAuth();

  // Clean up when dialog closes
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      stopRecording();
    };
  }, []);

  // Reset dialog state when opened
  useEffect(() => {
    if (open) {
      resetDialog();
    }
  }, [open]);

  // Format recording time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      let totalSize = 0;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          totalSize += e.data.size;
          
          // Warn if recording size exceeds 20MB (approaching the 25MB limit)
          if (totalSize > 20 * 1024 * 1024 && !error) {
            setError('Warning: Recording is getting large. Consider stopping soon to avoid upload issues.');
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioChunks(chunks);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data in 1-second chunks
      setRecording(true);
      setError(''); // Clear any previous errors
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions.');
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setRecording(false);
      setStage('review');
    }
  };

  // Process recording to get transcript with retry logic
  const processRecording = async () => {
    // Reset retry count on fresh attempts
    if (retryAttempt === 0) {
      setRetryAttempt(1);
    }
    
    if (!audioBlob) {
      setError('No recording available to process');
      return;
    }
    
    // Check file size before uploading
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
    if (audioBlob.size > MAX_FILE_SIZE) {
      setError(`File too large (${(audioBlob.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is 25MB.`);
      return;
    }
    
    setLoading(true);
    setError('');
    setTranscriptionStatus(retryAttempt > 1 ? 
      `Uploading audio... (Attempt ${retryAttempt}/3)` : 
      'Uploading audio...');
    
    try {
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Step 1: Upload audio to AssemblyAI through your backend with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const uploadResponse = await authFetch('/upload-audio', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`);
        }
        
        const { transcription_id } = await uploadResponse.json();
        setTranscriptionId(transcription_id);
        setTranscriptionStatus('Transcription started...');
        
        // Step 2: Poll for transcription completion
        pollIntervalRef.current = setInterval(async () => {
          try {
            const statusResponse = await authFetch(`/check-transcription/${transcription_id}`);
            
            if (!statusResponse.ok) {
              clearInterval(pollIntervalRef.current);
              const errorData = await statusResponse.json().catch(() => ({}));
              throw new Error(errorData.error || `Status check failed: ${statusResponse.status}`);
            }
            
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
              clearInterval(pollIntervalRef.current);
              setTranscript(statusData.transcript);
              setLoading(false);
              setTranscriptionStatus('');
              setStage('summary');
              setRetryAttempt(0); // Reset retry count on success
            } else if (statusData.status === 'error') {
              clearInterval(pollIntervalRef.current);
              throw new Error(statusData.error || 'Transcription failed');
            } else if (statusData.status === 'processing') {
              setTranscriptionStatus('Processing audio...');
            } else if (statusData.status === 'queued') {
              setTranscriptionStatus('Waiting in queue...');
            }
          } catch (pollError) {
            clearInterval(pollIntervalRef.current);
            throw pollError; // Pass error to main catch block
          }
        }, 3000); // Check every 3 seconds
        
        // Add timeout after 2 minutes to prevent endless polling
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            if (loading) {
              setLoading(false);
              throw new Error('Transcription is taking longer than expected.');
            }
          }
        }, 120000); // 2 minutes timeout
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError; // Pass to outer catch block
      }
      
    } catch (err) {
      console.error('Error processing recording:', err);
      clearInterval(pollIntervalRef.current);
      setLoading(false);
      
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout ? 
        'Request timed out. Server might be busy.' : 
        `Failed to process recording: ${err.message}`;
      
      // Check if we should retry
      if (retryAttempt < 3) {
        const nextAttempt = retryAttempt + 1;
        setError(`${errorMsg} Retrying... (${nextAttempt}/3)`);
        setRetryAttempt(nextAttempt);
        
        // Wait 2 seconds before retrying
        setTimeout(() => {
          processRecording();
        }, 2000);
      } else {
        // Max retries reached
        setError(`${errorMsg} Maximum retry attempts reached.`);
        setRetryAttempt(0); // Reset for next manual attempt
      }
    }
  };

  // Save note to database
  const saveNote = async () => {
    if (!transcript) {
      setError('No transcript available to save');
      return;
    }
    
    if (!noteTitle.trim()) {
      setError('Please enter a title for your note');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Process the transcript to generate formatted notes
      const processResponse = await authFetch('/process-transcript', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ transcript }),
      });
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Processing failed: ${processResponse.status}`);
      }
      
      const { summary } = await processResponse.json();
      
      // Save the formatted notes
      const postRes = await authFetch('/postNote', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: noteTitle,
          note: summary,
        }),
      });
      
      if (!postRes.ok) {
        const errorData = await postRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save note: ${postRes.status}`);
      }
      
      const savedNote = await postRes.json();
      
      // Notify parent component that a note was added
      onNoteAdded();
      
      // Open the NotesDialog with the new note
      openNotesDialog(noteTitle, summary);
      
      // Close this dialog
      handleClose();
      
    } catch (err) {
      console.error('Error saving note:', err);
      setLoading(false);
      setError(`Failed to save note: ${err.message}`);
    }
  };

  // Reset dialog to initial state
  const resetDialog = () => {
    setNoteTitle('');
    setRecording(false);
    setAudioChunks([]);
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
    setTranscript('');
    setLoading(false);
    setError('');
    setStage('recording');
    setTranscriptionStatus('');
    setTranscriptionId('');
    setRetryAttempt(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (recording) {
      stopRecording();
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    resetDialog();
    onClose();
  };

  // Manual retry button handler
  const handleManualRetry = () => {
    setRetryAttempt(1); // Start fresh retry cycle
    processRecording();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0' }}>
        <Box display="flex" alignItems="center">
          <Box
            component="img"
            src={MicSvg}
            alt="Microphone Icon"
            sx={{ width: 40, height: 40, marginRight: 1 }}
          />
          <Typography
            variant="h6"
            sx={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'bold', color: '#333' }}
          >
            {stage === 'recording' ? 'Record Audio Notes' : 
             stage === 'review' ? 'Review Recording' : 
             'Generate Notes from Recording'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Box sx={{ my: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography color="error" sx={{ fontFamily: 'Rubik, sans-serif', flex: 1 }}>
              {error}
            </Typography>
            
            {error.includes('Maximum retry attempts reached') && (
              <Button 
                onClick={handleManualRetry} 
                variant="outlined"
                color="primary"
                size="small"
                sx={{ ml: 2, fontFamily: 'Rubik, sans-serif', textTransform: 'none' }}
              >
                Try Again
              </Button>
            )}
          </Box>
        )}

        {stage === 'recording' && (
          <>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              my: 4
            }}>
              <Box sx={{
                width: 150,
                height: 150,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: recording ? 
                  'linear-gradient(135deg, #ff6b6b, #ff5e62)' : 
                  'linear-gradient(135deg, #b08dff, #6da9ff)',
                boxShadow: recording ? 
                  '0 0 20px rgba(255, 94, 98, 0.6)' : 
                  '0 4px 10px rgba(0, 0, 0, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: recording ? 
                    '0 0 25px rgba(255, 94, 98, 0.8)' : 
                    '0 6px 15px rgba(0, 0, 0, 0.3)',
                }
              }}
              onClick={recording ? stopRecording : startRecording}
              >
                {recording ? 
                  <StopCircle size={60} color="white" /> : 
                  <Mic size={60} color="white" />
                }
              </Box>
              
              <Typography 
                variant="h4" 
                sx={{ 
                  fontFamily: 'Rubik, sans-serif', 
                  fontWeight: 'bold',
                  mt: 2,
                  color: recording ? '#ff5e62' : '#6da9ff'
                }}
              >
                {recording ? formatTime(recordingTime) : 'Click to Start'}
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  fontFamily: 'Rubik, sans-serif',
                  mt: 1,
                  opacity: 0.8
                }}
              >
                {recording ? 'Recording in progress...' : 'Tap the microphone to begin recording'}
              </Typography>
              
              {recording && recordingTime > 120 && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'Rubik, sans-serif',
                    mt: 2,
                    color: '#ff5e62'
                  }}
                >
                  Recording is getting long. Consider finishing soon for better processing.
                </Typography>
              )}
            </Box>
          </>
        )}

        {stage === 'review' && (
          <>
            <TextField
              fullWidth
              label="Note Title"
              variant="outlined"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              sx={{
                marginTop: '16px',
                '& .MuiInputLabel-root': { fontFamily: 'Rubik, sans-serif' },
                '& .MuiOutlinedInput-root': { fontFamily: 'Rubik, sans-serif' },
              }}
            />
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              mt: 3
            }}>
              <Typography 
                variant="body1" 
                sx={{ fontFamily: 'Rubik, sans-serif', mb: 2 }}
              >
                Recording length: {formatTime(recordingTime)}
              </Typography>
              
              {audioUrl && (
                <Box sx={{ width: '100%', mb: 3 }}>
                  <audio controls src={audioUrl} style={{ width: '100%' }} />
                </Box>
              )}
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: 2, 
                mt: 2 
              }}>
                <Button
                  variant="outlined"
                  onClick={resetDialog}
                  startIcon={<Delete />}
                  sx={{ 
                    fontFamily: 'Rubik, sans-serif',
                    textTransform: 'none',
                  }}
                >
                  Discard & Re-record
                </Button>
                
                <Button
                  variant="contained"
                  onClick={processRecording}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  sx={{
                    fontFamily: 'Rubik, sans-serif',
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #b08dff, #6da9ff)',
                    padding: '8px 16px',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #a17be0, #5d98e0)',
                      boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  {loading ? (retryAttempt > 1 ? `Processing (Attempt ${retryAttempt}/3)...` : 'Processing...') : 'Process Recording'}
                </Button>
              </Box>
              
              {loading && (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  mt: 3
                }}>
                  <CircularProgress size={30} sx={{ mb: 2 }} />
                  <Typography 
                    variant="body2" 
                    sx={{ fontFamily: 'Rubik, sans-serif' }}
                  >
                    {transcriptionStatus || 'Processing your recording...'}
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {stage === 'summary' && (
          <>
            <TextField
              fullWidth
              label="Note Title"
              variant="outlined"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              sx={{
                marginTop: '16px',
                '& .MuiInputLabel-root': { fontFamily: 'Rubik, sans-serif' },
                '& .MuiOutlinedInput-root': { fontFamily: 'Rubik, sans-serif' },
              }}
            />
            
            <Typography 
              variant="h6" 
              sx={{ mt: 3, fontFamily: 'Rubik, sans-serif', fontWeight: 'bold' }}
            >
              Transcript:
            </Typography>
            
            <Box sx={{ 
              mt: 1, 
              p: 2, 
              border: '1px solid #e0e0e0', 
              borderRadius: 1,
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '0.9rem',
              fontFamily: 'Rubik, sans-serif'
            }}>
              {transcript.split('\n').map((line, i) => (
                <p key={i} style={{ margin: '0.5em 0' }}>{line}</p>
              ))}
            </Box>
            
            <Typography 
              variant="body2" 
              sx={{ mt: 2, fontFamily: 'Rubik, sans-serif', opacity: 0.8 }}
            >
              This transcript will be formatted as markdown notes when saved. You can edit the title before saving.
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px', justifyContent: 'space-between' }}>
        <Button 
          onClick={handleClose}
          sx={{
            fontFamily: 'Rubik, sans-serif',
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        
        {stage === 'summary' && (
          <Button
            onClick={saveNote}
            disabled={loading || !transcript}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <Save />}
            sx={{
              fontFamily: 'Rubik, sans-serif',
              textTransform: 'none',
              background: 'linear-gradient(135deg, #b08dff, #6da9ff)',
              padding: '8px 16px',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                background: 'linear-gradient(135deg, #a17be0, #5d98e0)',
                boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
              },
            }}
          >
            {loading ? 'Saving...' : 'Save Note'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RecordingDialog;