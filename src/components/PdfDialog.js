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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../context/AuthContext';

const PdfDialog = ({
  open,
  onClose,
  openNotesDialog,
  baseUrl = 'https://note-buddy-backend.onrender.com',
  onNoteAdded = () => {},
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [noteTitleInput, setNoteTitleInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Get auth context
  const { authFetch } = useAuth();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('pdf')) {
        setError('Please select a PDF file.');
        return;
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('File size must be less than 10MB.');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setUploadSuccess(false);
      
      // Auto-populate title if not set
      if (!noteTitleInput.trim()) {
        const fileName = file.name.replace('.pdf', '');
        setNoteTitleInput(`Notes from ${fileName}`);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateNotes = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      // Upload PDF and get summary
      const uploadResponse = await fetch(`${baseUrl}/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${localStorage.getItem('username')}:${localStorage.getItem('password')}` // Use your auth method
        },
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'Unknown error');
        throw new Error(`PDF upload error: ${uploadResponse.status} - ${errorText}`);
      }
      
      const { summary } = await uploadResponse.json();

      // Determine title
      const finalTitle = noteTitleInput.trim() || `Notes from ${selectedFile.name}`;

      // Save the note using authFetch
      const postRes = await authFetch('/postNote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          note: summary,
        }),
      });
      
      if (!postRes.ok) {
        const errorText = await postRes.text().catch(() => 'Unknown error');
        throw new Error(`PostNote API error: ${postRes.status} - ${errorText}`);
      }
      
      // Open the NotesDialog with the new note
      openNotesDialog(finalTitle, summary);
      onClose();
      
      // Notify parent that a note was added
      onNoteAdded();

      // Reset fields
      setSelectedFile(null);
      setNoteTitleInput('');
      setUploadSuccess(true);
    } catch (err) {
      console.error('Error generating notes from PDF:', err);
      setError(err.message || 'Unexpected error processing PDF');
    } finally {
      setLoading(false);
    }
  };

  // Clean up on close
  const handleClose = () => {
    // Reset fields
    setSelectedFile(null);
    setNoteTitleInput('');
    setError('');
    setLoading(false);
    setUploadSuccess(false);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onClose();
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0' }}>
        <Box display="flex" alignItems="center">
          <PictureAsPdfIcon 
            sx={{ 
              width: 40, 
              height: 40, 
              marginRight: 1,
              color: '#d32f2f' // PDF red color
            }} 
          />
          <Typography
            variant="h6"
            sx={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'bold', color: '#333' }}
          >
            Upload PDF Document
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Typography color="error" sx={{ my: 1, fontFamily: 'Rubik, sans-serif' }}>
            {error}
          </Typography>
        )}

        {/* File Upload Section */}
        <Box sx={{ mt: 2 }}>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          
          <Button
            variant="outlined"
            onClick={handleUploadClick}
            startIcon={<CloudUploadIcon />}
            fullWidth
            sx={{
              height: '80px',
              borderStyle: 'dashed',
              borderWidth: '2px',
              borderColor: selectedFile ? '#4caf50' : '#b08dff',
              backgroundColor: selectedFile ? '#f3f9f3' : '#fafafa',
              fontFamily: 'Rubik, sans-serif',
              textTransform: 'none',
              fontSize: '16px',
              color: selectedFile ? '#2e7d32' : '#b08dff',
              '&:hover': {
                backgroundColor: selectedFile ? '#e8f5e8' : '#f0f0ff',
                borderColor: selectedFile ? '#4caf50' : '#9575cd',
              },
            }}
          >
            {selectedFile ? (
              <Box sx={{ textAlign: 'center' }}>
                <CheckCircleIcon sx={{ mr: 1, color: '#4caf50' }} />
                {selectedFile.name}
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
            ) : (
              'Click to select PDF file'
            )}
          </Button>
          
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 1, 
              display: 'block', 
              textAlign: 'center',
              fontFamily: 'Rubik, sans-serif',
              color: '#666'
            }}
          >
            Maximum file size: 10MB
          </Typography>
        </Box>

        {/* Title Input */}
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
        
        {/* Loading State */}
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
              sx={{ fontFamily: 'Rubik, sans-serif', textAlign: 'center' }}
            >
              Processing PDF and generating notes...
              <br />
              <Typography variant="caption" sx={{ color: '#666' }}>
                This may take a moment for larger documents
              </Typography>
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
          disabled={loading || !selectedFile}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
          sx={{
            fontFamily: 'Rubik, sans-serif',
            textTransform: 'none',
            background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
            padding: '8px 16px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ff5252, #e55100)',
              boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
            },
            '&:disabled': {
              background: '#cccccc',
              color: '#666666',
            },
          }}
        >
          {loading ? 'Processing...' : 'Generate Notes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PdfDialog;