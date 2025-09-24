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
  const timeoutRef = useRef(null);

  // Get auth context
  const { authFetch } = useAuth();

  const handleGenerateNotes = async () => {
    if (!youtubeLink.trim()) {
      setError('Please paste a YouTube link.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Use authFetch with authentication
      const summaryRes = await authFetch('/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ URL: youtubeLink.trim() }),
      });
      
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
      setLoading(false);
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  // Clean up on close
  const handleClose = () => {
    // Reset fields
    setYoutubeLink('');
    setNoteTitleInput('');
    setError('');
    setLoading(false);
    
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
          <Typography color="error" sx={{ my: 1, fontFamily: 'Rubik, sans-serif' }}>
            {error}
          </Typography>
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
              Generating notes...
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
          {loading ? 'Generating...' : 'Generate Notes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default YoutubeDialog;