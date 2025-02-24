"use client"

import * as React from "react"

const Button = React.forwardRef(({ className, type = "button", ...props }, ref) => {
  return (
    <button
      type={type}
      className={className}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
