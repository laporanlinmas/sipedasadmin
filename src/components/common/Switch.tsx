import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <label className={`set-switch ${checked ? 'on' : ''}`} style={{ margin: 0, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="set-switch-track"></span>
      <span className="set-switch-knob"></span>
    </label>
  );
};

export default Switch;
