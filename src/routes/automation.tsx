import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/automation')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/automation"!</div>
}
