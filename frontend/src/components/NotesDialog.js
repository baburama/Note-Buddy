import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { marked } from 'marked';

// Component to render Markdown content as HTML
const MarkdownContent = ({ markdown }) => (
  <div dangerouslySetInnerHTML={{ __html: marked(markdown) }} />
);

const NotesDialog = ({ 
  open, 
  onClose, 
  title, 
  content 
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #b08dff, #6da9ff)',
          padding: '16px',
          textAlign: 'center',
          color: '#fff',
          fontFamily: 'Rubik, sans-serif',
          fontSize: '2rem',
          fontWeight: 'bold',
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          background: 'linear-gradient(135deg, #cf9aff, #95c0ff)',
          color: '#fff',
          fontFamily: 'Rubik, sans-serif',
          padding: '24px',
          lineHeight: 1.6,
        }}
      >
        <MarkdownContent markdown={content} />
      </DialogContent>
      <DialogActions
        sx={{
          background: 'linear-gradient(135deg, #cf9aff, #95c0ff)',
          padding: '16px',
          justifyContent: 'center',
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
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
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotesDialog;