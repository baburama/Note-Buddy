import React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';

const CardAction = ({ 
  title, 
  subtext = "", 
  image = "", 
  icon: IconComponent, // NEW: Material-UI icon component
  iconColor, // NEW: Icon color
  onClick, 
  notesCard = false,
  onDelete = null
}) => {
  // For notes cards, we want them to fill the container width.
  const cardStyles = notesCard
    ? {
        width: '100%',
        background: 'linear-gradient(135deg, #be99ff, #66c2ff)',  // Alternative gradient for notes cards
        borderRadius: 4,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative', // Added for absolute positioning of delete button
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
          '& .delete-button': {
            opacity: 1,
            transform: 'translateY(0)',
          }
        },
      }
    : {
        flex: 1,
        maxWidth: 300,
        background: 'linear-gradient(135deg, #b08dff, #6da9ff)',
        borderRadius: 4,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
        },
      };

  // Handle delete click without triggering the card click
  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent the card click from happening
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <Card sx={cardStyles}>
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
          >
            {/* UPDATED: Support both image and Material-UI icon */}
            {image ? (
              <Box
                component="img"
                src={image}
                alt="icon"
                sx={{
                  width: 40,
                  height: 40,
                  mr: 2,
                }}
              />
            ) : IconComponent ? (
              <IconComponent 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  mr: 2,
                  color: iconColor || '#fff',
                }} 
              />
            ) : null}
            
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontFamily: 'Rubik, sans-serif',
                  fontSize: '1.5rem',
                  color: '#fff',
                  textAlign: 'center',
                }}
              >
                {title}
              </Typography>
              {subtext && (
                <Typography
                  variant="body2"
                  component="p"
                  sx={{
                    fontFamily: 'Rubik, sans-serif',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'center',
                    mt: 0.5,
                  }}
                >
                  {subtext}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
      
      {/* Delete button - only show for notes cards */}
      {notesCard && onDelete && (
        <Tooltip title="Delete note">
          <IconButton 
            className="delete-button"
            onClick={handleDeleteClick}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
              },
              opacity: 0.7,
              transform: 'translateY(-5px)',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            size="small"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Card>
  );
};

export default CardAction;