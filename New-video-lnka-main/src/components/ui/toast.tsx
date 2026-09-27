import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"

export type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
export type ToastActionElement = React.ReactElement<typeof ToastPrimitives.Action>
