import React from 'react';
import './CardAction.css'; // Assuming you have styles here
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

const CardAction = ({ 
  title, 
  subtext, 
  onClick, 
  image, 
  icon: IconComponent, // New prop for Material-UI icons
  iconColor, // New prop for icon color
  notesCard = false, 
  onDelete 
}) => {
  const handleCardClick = (e) => {
    // Prevent triggering card click when delete button is clicked
    if (e.target.closest('.delete-button')) {
      return;
    }
    onClick();
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent card click
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div 
      className={`card-action ${notesCard ? 'notes-card' : ''}`}
      onClick={handleCardClick}
    >
      <div className="card-content">
        <div className="card-icon-container">
          {/* Support both image and Material-UI icon */}
          {image ? (
            <img src={image} alt={`${title} icon`} className="card-icon" />
          ) : IconComponent ? (
            <IconComponent 
              sx={{ 
                fontSize: 40, 
                color: iconColor || '#666',
              }} 
            />
          ) : null}
        </div>
        
        <div className="card-text">
          <h3 className="card-title">{title}</h3>
          <p className="card-subtext">{subtext}</p>
        </div>
        
        {/* Delete button for notes cards */}
        {notesCard && onDelete && (
          <div className="delete-button">
            <Tooltip title="Delete note">
              <IconButton
                onClick={handleDeleteClick}
                sx={{
                  color: '#ff6b6b',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardAction;