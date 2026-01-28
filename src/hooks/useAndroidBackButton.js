// src/hooks/useAndroidBackButton.js
import { useEffect, useRef } from 'react';

export const useAndroidBackButton = (view, setView) => {
  // 1. Define which views count as "Modals" (require a Back Button to close)
  const modalViews = [
    'cart',
    'checkout',
    'item-details',
    'profile',
    'favorites',
  ];

  // 2. Use a Ref to track if we have already pushed a state to history.
  // We use useRef so this value persists between renders without causing re-renders.
  const hasPushedState = useRef(false);

  useEffect(() => {
    const isModal = modalViews.includes(view);

    if (isModal) {
      // --- ENTERING OR SWITCHING BETWEEN MODALS ---

      // Only push a new history state if we haven't done it yet.
      // If we go from Cart -> Checkout, hasPushedState is already true, so we do nothing.
      if (!hasPushedState.current) {
        window.history.pushState({ modalOpen: true }, '');
        hasPushedState.current = true;
      }

      const handleBackButton = (event) => {
        // When hardware back is pressed, the browser naturally pops the state.
        // We just need to update our tracker and React state.
        hasPushedState.current = false;
        setView('menu');
      };

      window.addEventListener('popstate', handleBackButton);

      return () => {
        window.removeEventListener('popstate', handleBackButton);
        // We DO NOT force history.back() here anymore.
        // We let the "else" block handle the cleanup when we actually leave the modal zone.
      };
    } else {
      // --- EXITING TO MENU (NON-MODAL) ---

      // If we are back in the Menu, but our tracker says we still have a "Modal" state in history
      // (This happens if the user clicked a "Close" X button instead of using the Back Button)
      if (hasPushedState.current) {
        window.history.back(); // Remove the dummy state manually
        hasPushedState.current = false;
      }
    }
  }, [view, setView]);
};
