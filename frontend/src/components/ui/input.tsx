import type { InputHTMLAttributes } from 'react'
import { Input as AntInput, type InputProps as AntInputProps } from 'antd'

export function Input({ className, size: _size, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <AntInput {...(props as AntInputProps)} className={className} />
}
