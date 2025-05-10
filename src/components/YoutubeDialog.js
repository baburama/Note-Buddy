import React, { useState, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import YoutubeSvg from '../assets/youtube-color-svgrepo-com.svg';
import { useAuth } from '../context/AuthContext';

const YoutubeDialog = ({
  open,
  onClose,
  openNotesDialog,
  baseUrl = 'https://note-buddy-backend.onrender.com',
  onNoteAdded = () => {},
}) => {
  const [youtubeLink, setYoutubeLink] = useState('');
  const [noteTitleInput, setNoteTitleInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0); // Track retry attempts
  const timeoutRef = useRef(null);

  // Get auth context
  const { authFetch } = useAuth();

  const handleGenerateNotes = async () => {
    // Reset retry count on fresh attempts or increment for retries
    if (retryAttempt === 0) {
      setRetryAttempt(1);
    }

    if (!youtubeLink.trim()) {
      setError('Please paste a YouTube link.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      timeoutRef.current = setTimeout(() => controller.abort(), 60000); // 60 second timeout for YouTube processing
      
      // Set status message based on retry attempt
      const statusMessage = retryAttempt > 1 ? 
        `Generating notes... (Attempt ${retryAttempt}/3)` : 
        'Generating notes...';
      
      // Use authFetch with authentication and signal for timeout
      const summaryRes = await authFetch('/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ URL: youtubeLink.trim() }),
        signal: controller.signal
      });
      
      // Clear timeout since request completed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!summaryRes.ok) {
        const errorText = await summaryRes.text().catch(() => 'Unknown error');
        throw new Error(`Summary API error: ${summaryRes.status} - ${errorText}`);
      }
      
      const { Summary } = await summaryRes.json();

      // Determine title
      const finalTitle = noteTitleInput.trim() || 'Notes from YouTube Video';

      // Use authFetch for posting the note
      const postRes = await authFetch('/postNote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          note: Summary,
        }),
      });
      
      if (!postRes.ok) {
        const errorText = await postRes.text().catch(() => 'Unknown error');
        throw new Error(`PostNote API error: ${postRes.status} - ${errorText}`);
      }
      
      // Reset retry count on success
      setRetryAttempt(0);
      
      // 3) Open the NotesDialog with the new note
      openNotesDialog(finalTitle, Summary);
      onClose();
      
      // Notify parent that a note was added
      onNoteAdded();

      // reset fields
      setYoutubeLink('');
      setNoteTitleInput('');
    } catch (err) {
      console.error('Error generating notes:', err);
      
      // Clear timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setLoading(false);
      
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout ? 
        'Request timed out. Server might be busy.' : 
        (err.message || 'Unexpected error');
      
      // Check if we should retry
      if (retryAttempt < 3) {
        const nextAttempt = retryAttempt + 1;
        setError(`${errorMsg} Retrying... (${nextAttempt}/3)`);
        setRetryAttempt(nextAttempt);
        
        // Wait 2 seconds before retrying
        setTimeout(() => {
          handleGenerateNotes();
        }, 2000);
      } else {
        // Max retries reached
        setError(`${errorMsg} Maximum retry attempts reached.`);
        setRetryAttempt(0); // Reset for next manual attempt
      }
    } finally {
      if (retryAttempt === 0) {  // Only set loading to false on success or after max retries
        setLoading(false);
      }
    }
  };

  // Manual retry button handler
  const handleManualRetry = () => {
    setRetryAttempt(1); // Start fresh retry cycle
    handleGenerateNotes();
  };

  // Clean up on close
  const handleClose = () => {
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Reset fields
    setYoutubeLink('');
    setNoteTitleInput('');
    setError('');
    setLoading(false);
    setRetryAttempt(0);
    
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0' }}>
        <Box display="flex" alignItems="center">
          <Box
            component="img"
            src={YoutubeSvg}
            alt="YouTube Icon"
            sx={{ width: 40, height: 40, marginRight: 1 }}
          />
          <Typography
            variant="h6"
            sx={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'bold', color: '#333' }}
          >
            YouTube Video
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

        <TextField
          fullWidth
          label="Paste YouTube link"
          variant="outlined"
          value={youtubeLink}
          onChange={(e) => setYoutubeLink(e.target.value)}
          sx={{
            marginTop: '16px',
            '& .MuiInputLabel-root': { fontFamily: 'Rubik, sans-serif' },
            '& .MuiOutlinedInput-root': { fontFamily: 'Rubik, sans-serif' },
          }}
        />

        <TextField
          fullWidth
          label="Custom Note Title (optional)"
          variant="outlined"
          value={noteTitleInput}
          onChange={(e) => setNoteTitleInput(e.target.value)}
          sx={{
            marginTop: '16px',
            '& .MuiInputLabel-root': { fontFamily: 'Rubik, sans-serif' },
            '& .MuiOutlinedInput-root': { fontFamily: 'Rubik, sans-serif' },
          }}
        />
        
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
              {retryAttempt > 1 ? 
                `Generating notes... (Attempt ${retryAttempt}/3)` : 
                'Generating notes...'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '16px' }}>
        <Button
          onClick={handleClose}
          sx={{
            fontFamily: 'Rubik, sans-serif',
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleGenerateNotes}
          disabled={loading || !youtubeLink.trim()}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : null}
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
          {loading ? 
            (retryAttempt > 1 ? `Generating... (${retryAttempt}/3)` : 'Generating...') : 
            'Generate Notes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default YoutubeDialog;