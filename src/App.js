import React, { useState, useEffect } from 'react';
import './App.css';
import NotesIcon from './assets/notes-notebook-svgrepo-com.svg';
import YoutubeSvg from './assets/youtube-color-svgrepo-com.svg';
import MicSvg from './assets/mic-sound-record-voice-svgrepo-com.svg';
import CardAction from './components/CardAction';
import YoutubeDialog from './components/YoutubeDialog';
import NotesDialog from './components/NotesDialog';
import RecordingDialog from './components/RecordingDialog';
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useAuth } from './context/AuthContext';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

function App() {
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notesList, setNotesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get authentication context
  const { username, logout, authFetch, backendStatus, checkBackendHealth } = useAuth();

  // Base URL for API endpoints
  const baseUrl = 'https://note-buddy-backend.onrender.com';

  // Check backend health on initial load
  useEffect(() => {
    // Initial health check when app loads
    checkBackendHealth();
  }, [checkBackendHealth]);

  // Fetch user notes on component mount and when username or refreshTrigger changes
  useEffect(() => {
    if (username) {
      fetchUserNotes();
    }
  }, [username, refreshTrigger]);

  // Function to fetch user notes from the backend
  const fetchUserNotes = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Use authFetch instead of regular fetch
      const response = await authFetch('/userNotes');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetched notes:", data);
      
      // Transform the data to match the expected format for notesList
      const formattedNotes = data.map(note => ({
        id: note.id,
        title: note.title,
        content: note.note
      }));
      
      setNotesList(formattedNotes);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId) => {
    try {
      const response = await authFetch(`/deleteNote/${noteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.status}`);
      }
      
      // After successful deletion, refresh the notes list
      triggerRefresh();
    } catch (err) {
      console.error('Error deleting note:', err);
      // Optionally display an error message to the user
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    // No need to navigate since the AuthContext will handle redirection
  };

  const handleRecordNotesClick = () => {
    setIsRecordingDialogOpen(true);
  };

  const handleYoutubeVideoClick = () => {
    setIsYoutubeDialogOpen(true);
  };

  const handleCloseYoutubeDialog = () => {
    setIsYoutubeDialogOpen(false);
    // Refresh notes when dialog is closed
    triggerRefresh();
  };

  const handleCloseRecordingDialog = () => {
    setIsRecordingDialogOpen(false);
    // Refresh notes when dialog is closed
    triggerRefresh();
  };

  // Function to trigger a refresh of the notes list
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Opens the NotesDialog with provided title and content.
  const openNotesDialog = (title, content) => {
    setNoteTitle(title);
    setNoteContent(content);
    setIsNotesDialogOpen(true);
  };

  // When a note card from the list is clicked.
  const handleNoteCardClick = (title, content) => {
    openNotesDialog(title, content);
  };

  // Closes both dialogs.
  const handleCloseNotesDialog = () => {
    setIsNotesDialogOpen(false);
    // Refresh notes when dialog is closed
    triggerRefresh();
  };

  // Trigger backend refresh
  const handleRefreshBackend = () => {
    checkBackendHealth();
  };

  return (
    <div className="App">
      {/* Header Section */}
      <header className="App-header">
        <div className="title-icon-container">
          <div className="title-subtext-container" style={{ marginLeft: `125px` }}>
            <h1>NoteBuddy.ai</h1>
            <p className="header-subtext" style={{ marginLeft: "25px" }}>
              Create New Notes
            </p>
          </div>
          <img src={NotesIcon} alt="Notes Icon" className="notes-icon" />
        </div>
        
        {/* User info and Logout Button */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'Rubik, sans-serif',
              color: '#ffffff',
              opacity: 0.9,
            }}
          >
            {username}
          </Typography>
          <Tooltip title="Logout">
            <Button
              variant="contained"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                fontFamily: 'Rubik, sans-serif',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #ff9a9e, #fad0c4)',
                padding: '6px 12px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                borderRadius: '20px',
                '&:hover': {
                  background: 'linear-gradient(135deg, #ff8a8e, #fac0b4)',
                  boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Logout
            </Button>
          </Tooltip>
        </div>
      </header>

      {/* Backend Status Alert */}
      {backendStatus === 'starting' && (
        <Alert 
          severity="info" 
          sx={{ 
            margin: '10px auto', 
            maxWidth: '90%',
            display: 'flex',
            alignItems: 'center'
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRefreshBackend}
            >
              Refresh
            </Button>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <CircularProgress size={20} color="info" />
            <span>
              The server is starting up. This may take up to 30 seconds.
            </span>
          </div>
        </Alert>
      )}

      {/* Action Section */}
      <section className="action-section">
        <div className="action-buttons-container">
          <CardAction 
            title="Record Notes" 
            onClick={handleRecordNotesClick} 
            subtext="Record & transcribe" 
            image={MicSvg} 
          />
          <CardAction 
            title="YouTube Video" 
            onClick={handleYoutubeVideoClick} 
            subtext="Paste Youtube link" 
            image={YoutubeSvg} 
          />
        </div>
      </section>
      
      {/* Notes Section */}
      <section className="notes-section">
        <p className="header-subtext">Your notes</p>
        {error && <p className="error-message">{error}</p>}
        {isLoading ? (
          <p>Loading notes...</p>
        ) : (
          <div className="notes-cards-container">
            {notesList.length > 0 ? (
              notesList.map((note, index) => (
                <CardAction
                  key={note.id || index}
                  title={note.title}
                  subtext="View Note"
                  onClick={() => handleNoteCardClick(note.title, note.content)}
                  notesCard={true}  // Render as a full-width note card
                  onDelete={() => handleDeleteNote(note.id)}  // Add delete functionality
                />
              ))
            ) : (
              <p>No notes found. Create your first note!</p>
            )}
          </div>
        )}
      </section>

      {/* YouTube Dialog */}
      <YoutubeDialog 
         open={isYoutubeDialogOpen} 
         onClose={handleCloseYoutubeDialog} 
         openNotesDialog={openNotesDialog}
         baseUrl={baseUrl}
         username={username}
         onNoteAdded={triggerRefresh}
      />

      {/* Recording Dialog */}
      <RecordingDialog 
         open={isRecordingDialogOpen} 
         onClose={handleCloseRecordingDialog} 
         openNotesDialog={openNotesDialog}
         baseUrl={baseUrl}
         username={username}
         onNoteAdded={triggerRefresh}
      />

      {/* Notes Dialog */}
      <NotesDialog 
         open={isNotesDialogOpen} 
         onClose={handleCloseNotesDialog} 
         title={noteTitle} 
         content={noteContent} 
      />
    </div>
  );
}

export default App;