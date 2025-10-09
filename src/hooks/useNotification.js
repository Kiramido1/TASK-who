import { useEffect } from 'react';

export const useNotification = (hasOtherParticipants) => {
  useEffect(() => {
    const favicon = document.getElementById('favicon');
    
    if (hasOtherParticipants) {
      // Switch to notification favicon
      favicon.href = '/favicon-notification.png';
    } else {
      // Switch back to normal favicon
      favicon.href = '/favicon-normal.png';
    }
  }, [hasOtherParticipants]);
};

