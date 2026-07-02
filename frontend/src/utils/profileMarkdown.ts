import type { ProfileContent, ProfileWorkItem } from "../types/home"

const clean = (line: string) => line.trim()

const stripMarker = (line: string, marker: string) => clean(line.slice(marker.length))

const splitLabelValue = (value: string) => {
  const separatorIndex = value.search(/[：:]/)

  if (separatorIndex === -1) return null

  return {
    label: clean(value.slice(0, separatorIndex)),
    detail: clean(value.slice(separatorIndex + 1)),
  }
}

export const parseProfileMarkdown = (source: string): ProfileContent => {
  const lines = source.split(/\r?\n/).map(clean).filter(Boolean)
  const profile: ProfileContent = {
    name: "",
    headline: "",
    contacts: [],
    work: [],
    skills: [],
  }

  let section = ""
  let currentWork: ProfileWorkItem | null = null

  lines.forEach((line) => {
    if (line.startsWith("# ")) {
      profile.name = stripMarker(line, "# ")
      return
    }

    if (line.startsWith(">")) {
      profile.headline = stripMarker(line, ">")
      return
    }

    if (line.startsWith("## ")) {
      section = stripMarker(line, "## ")
      currentWork = null
      return
    }

    if (line.startsWith("### ")) {
      currentWork = {
        title: stripMarker(line, "### "),
        meta: [],
        details: [],
      }
      profile.work.push(currentWork)
      return
    }

    if (!line.startsWith("- ")) return

    const value = stripMarker(line, "- ")

    if (section === "工作及职责" && currentWork) {
      const pair = splitLabelValue(value)

      if (pair && (pair.label === "时间" || pair.label === "岗位")) {
        currentWork.meta.push(pair.detail)
        return
      }

      currentWork.details.push(value)
      return
    }

    if (section === "技术栈") {
      profile.skills.push(value)
      return
    }

    const pair = splitLabelValue(value)

    if (pair) {
      profile.contacts.push({
        label: pair.label,
        value: pair.detail,
      })
    }
  })

  return profile
}
