import BaseErrorPage from './BaseErrorPage'

export default function NotFoundPage() {
  return (
    <BaseErrorPage
      code="404"
      title="Page Not Found"
      description="Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on track."
      type="404"
    />
  )
}
