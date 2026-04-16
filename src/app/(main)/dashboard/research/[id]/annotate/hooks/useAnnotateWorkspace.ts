import { useEffect, useState } from 'react'
import {
  saveStudentWorkspaceDraft,
  saveTeacherWorkspaceVersion,
  submitStudentWorkspaceVersion,
  updateReviewDecision,
} from '../actions'
import { type ResearchDocumentContent } from '../types'

export function useAnnotateWorkspace({
  researchId,
  editableWorkspaceContent,
  setResearchStatus,
  reloadWorkspaceData,
}: {
  researchId: string
  editableWorkspaceContent: ResearchDocumentContent
  setResearchStatus: (status: string) => void
  reloadWorkspaceData: () => Promise<void>
}) {
  const [workspaceContent, setWorkspaceContent] = useState<ResearchDocumentContent>(
    editableWorkspaceContent
  )
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [changeSummary, setChangeSummary] = useState('')
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false)
  const [isSavingReviewEdit, setIsSavingReviewEdit] = useState(false)
  const [isUpdatingDecision, setIsUpdatingDecision] = useState(false)

  useEffect(() => {
    setWorkspaceContent(editableWorkspaceContent)
  }, [editableWorkspaceContent])

  const handleStudentDraftSave = async () => {
    setIsSavingDraft(true)
    setActionFeedback(null)

    try {
      await saveStudentWorkspaceDraft(researchId, workspaceContent, changeSummary || null)
      setActionFeedback('Draft saved in the unified editor.')
      await reloadWorkspaceData()
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : 'Failed to save draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleStudentSubmit = async () => {
    setIsSubmittingVersion(true)
    setActionFeedback(null)

    try {
      const result = await submitStudentWorkspaceVersion(
        researchId,
        workspaceContent,
        changeSummary || null
      )
      setActionFeedback(`Submitted as version ${result.versionLabel}.`)
      await reloadWorkspaceData()
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : 'Failed to submit version.')
    } finally {
      setIsSubmittingVersion(false)
    }
  }

  const handleTeacherSave = async () => {
    setIsSavingReviewEdit(true)
    setActionFeedback(null)

    try {
      const result = await saveTeacherWorkspaceVersion(
        researchId,
        workspaceContent,
        changeSummary || null
      )
      setActionFeedback(`Review edit saved as version ${result.versionLabel}.`)
      await reloadWorkspaceData()
    } catch (error) {
      setActionFeedback(
        error instanceof Error ? error.message : 'Failed to save review edit.'
      )
    } finally {
      setIsSavingReviewEdit(false)
    }
  }

  const handleReviewDecision = async (
    nextStatus: 'Revision Requested' | 'Approved'
  ) => {
    setIsUpdatingDecision(true)

    try {
      const status = await updateReviewDecision(researchId, nextStatus)
      setResearchStatus(status)
      setActionFeedback(`Research status updated to ${status}.`)
    } finally {
      setIsUpdatingDecision(false)
    }
  }

  return {
    workspaceContent,
    setWorkspaceContent,
    actionFeedback,
    setActionFeedback,
    changeSummary,
    setChangeSummary,
    isSavingDraft,
    isSubmittingVersion,
    isSavingReviewEdit,
    isUpdatingDecision,
    handleStudentDraftSave,
    handleStudentSubmit,
    handleTeacherSave,
    handleReviewDecision,
  }
}
