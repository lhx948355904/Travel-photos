export interface ProfileContact {
  label: string
  value: string
}

export interface ProfileWorkItem {
  title: string
  meta: string[]
  details: string[]
}

export interface ProfileContent {
  name: string
  headline: string
  contacts: ProfileContact[]
  work: ProfileWorkItem[]
  skills: string[]
}
