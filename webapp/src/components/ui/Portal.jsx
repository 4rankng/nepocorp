import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

/**
 * Portal component for rendering children outside the current DOM hierarchy
 * Useful for modals, dropdowns, tooltips, and other overlay elements
 */
const Portal = ({ children, container = null, enabled = true }) => {
  const portalRef = useRef(null);

  useEffect(() => {
    if (enabled) {
      // Create or use provided container
      if (container) {
        portalRef.current = container;
      } else {
        // Create a div and append it to document.body
        portalRef.current = document.createElement('div');
        portalRef.current.setAttribute('data-portal', 'true');
        document.body.appendChild(portalRef.current);
      }
    }

    // Cleanup function
    return () => {
      if (enabled && portalRef.current && !container) {
        // Only remove if we created the container
        document.body.removeChild(portalRef.current);
      }
    };
  }, [container, enabled]);

  // If not enabled, render children normally
  if (!enabled) {
    return children;
  }

  // If portal container is ready, create portal
  if (portalRef.current) {
    return createPortal(children, portalRef.current);
  }

  // Fallback: don't render anything if portal isn't ready
  return null;
};

Portal.propTypes = {
  children: PropTypes.node.isRequired,
  container: PropTypes.instanceOf(Element),
  enabled: PropTypes.bool,
};

export default Portal;
