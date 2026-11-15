export async function AccountCreatedNotice({
  searchParams,
  message,
}: {
  searchParams: Promise<{ created?: string | string[] }>
  message: string
}) {
  const created = (await searchParams).created
  if ((Array.isArray(created) ? created[0] : created) !== "1") {
    return null
  }

  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  )
}
