import BaseErrorPage from './BaseErrorPage'

export default function ForbiddenPage() {
  return (
    <BaseErrorPage
      code="403"
      title="Access Forbidden"
      description="You don't have permission to access this page. If you believe this is an error, please contact your administrator."
      type="403"
    />
  )
}
