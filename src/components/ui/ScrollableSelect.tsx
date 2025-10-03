import React, { useRef, useEffect } from 'react';

interface ScrollableSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  children: React.ReactNode;
  placeholder?: string;
}

const ScrollableSelect: React.FC<ScrollableSelectProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
  required = false,
  children,
  placeholder
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const selectElement = selectRef.current;
    if (!selectElement) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events when the select is focused or hovered
      if (document.activeElement === selectElement || selectElement.matches(':hover')) {
        e.preventDefault();
        
        const options = Array.from(selectElement.options);
        const currentIndex = options.findIndex(option => option.value === value);
        
        if (e.deltaY > 0) {
          // Scroll down - select next option
          const nextIndex = Math.min(currentIndex + 1, options.length - 1);
          if (nextIndex !== currentIndex) {
            const nextOption = options[nextIndex];
            selectElement.value = nextOption.value;
            onChange({
              target: { value: nextOption.value }
            } as React.ChangeEvent<HTMLSelectElement>);
          }
        } else {
          // Scroll up - select previous option
          const prevIndex = Math.max(currentIndex - 1, 0);
          if (prevIndex !== currentIndex) {
            const prevOption = options[prevIndex];
            selectElement.value = prevOption.value;
            onChange({
              target: { value: prevOption.value }
            } as React.ChangeEvent<HTMLSelectElement>);
          }
        }
      }
    };

    // Add wheel event listener
    selectElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      selectElement.removeEventListener('wheel', handleWheel);
    };
  }, [value, onChange]);

  return (
    <select
      ref={selectRef}
      value={value || ""}
      onChange={onChange}
      className={`${className} scrollable-select`}
      disabled={disabled}
      required={required}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
};

export default ScrollableSelect;
