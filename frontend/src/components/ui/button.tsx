import type { ButtonHTMLAttributes } from 'react'
import { Button as AntButton } from 'antd'

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'color'> & {
  variant?: 'default' | 'outline' | 'ghost' | 'soft' | 'danger'
  size?: 'default' | 'sm' | 'icon'
}

export function Button({
  variant = 'default', size = 'default', children, className,
  type, disabled, onClick, title, 'aria-label': ariaLabel, ...rest
}: ButtonProps) {
  const buttonType = variant === 'default' ? 'primary' : variant === 'outline' ? 'default' : 'text'
  return (
    <AntButton
      {...rest}
      type={buttonType}
      htmlType={type ?? 'submit'}
      danger={variant === 'danger'}
      size={size === 'sm' || size === 'icon' ? 'small' : 'middle'}
      shape={size === 'icon' ? 'circle' : 'default'}
      className={className}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      style={variant === 'soft' ? { background: 'var(--ant-color-fill-tertiary)' } : undefined}
    >
      {children}
    </AntButton>
  )
}
