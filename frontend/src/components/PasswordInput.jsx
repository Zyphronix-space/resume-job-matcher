import { useState } from 'react'
import GlassInput from './glass/GlassInput.jsx'
import { EyeIcon, EyeOffIcon } from './icons.jsx'

// GlassInput with a show/hide toggle. The toggle is a real button with
// aria-pressed, sits after the input in tab order, and never submits the
// form.
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false)

  return (
    <GlassInput
      {...props}
      control={(controlProps) => (
        <div className="password-control">
          <input {...controlProps} type={visible ? 'text' : 'password'} />
          <button
            type="button"
            className="password-toggle"
            aria-label="Show password"
            aria-pressed={visible}
            aria-controls={controlProps.id}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
            <span aria-hidden="true">{visible ? 'Hide' : 'Show'}</span>
          </button>
        </div>
      )}
    />
  )
}
