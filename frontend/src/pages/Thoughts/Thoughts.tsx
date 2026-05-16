import { useState, useEffect, useRef } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { useDraft } from '../../hooks/useDraft';
import { useFieldValidation, required } from '../../hooks/useFieldValidation';
import DateInput from '../../components/DateInput/DateInput';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState/PageState';
import ChatView from '../AI/ChatView';
import { DIARY_API } from '../../services/api';
import type { DiaryEntry } from '../../types';
import './Thoughts.css';

interface DiaryDraft {
  title: string;
  content: string;
  date: string;
}

type ThoughtTab = 'write' | 'ai' | 'review';

const today = () => new Date().toISOString().split('T')[0];

export default function ThoughtsPage() {
  const [activeTab, setActiveTab] = useState<ThoughtTab>('write');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(today());
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [reviewDate, setReviewDate] = useState(today());
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const { apiFetch } = useApi();
  const { addToast } = useToast();

  // ── Inline validation ──
  const { errors, touchField, validateAll } = useFieldValidation(
    { title, content },
    {
      title: required('请填写日记标题'),
      content: required('请填写日记内容'),
    },
  );

  const { data: entries, loading: entriesLoading, error, refetch } = useFetch<DiaryEntry[]>(
    () => apiFetch(DIARY_API.byDate(reviewDate)),
    [apiFetch, reviewDate],
  );

  const entryList = entries ?? [];

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  // ── Draft persistence ──
  const createDraft = useDraft<DiaryDraft>('thoughts.create');
  const editKey = editingEntryId
    ? `thoughts.edit.${editingEntryId}`
    : 'thoughts.edit.__none__';
  const editDraft = useDraft<DiaryDraft>(editKey);

  // Track whether a create draft existed on mount (so autosave doesn't re-trigger banner)
  const [hadCreateDraftOnMount] = useState(() => createDraft.hasDraft);
  const [createDraftHandled, setCreateDraftHandled] = useState(false);

  // Track which edit entry's restore has been handled
  const [editDraftHandledId, setEditDraftHandledId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setEditDraftHandledId(null);
  }, [editingEntryId]);

  // Wire beforeunload guard — compare current form vs stored draft
  const currentDraft: DiaryDraft = { title, content, date };
  createDraft.setCurrent(currentDraft);
  editDraft.setCurrent(currentDraft);
  const isFormDirty = title.trim() !== '' || content.trim() !== '';
  createDraft.setDirty(isFormDirty);
  editDraft.setDirty(isFormDirty);

  // Debounced autosave (1500ms)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const draft: DiaryDraft = { title, content, date };
    if (!title.trim() && !content.trim()) return;

    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      if (editingEntryId === null) {
        createDraft.save(draft);
      } else {
        editDraft.save(draft);
      }
    }, 1500);

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
    // Only re-run when form fields or edit mode change — save/clear are stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, date, editingEntryId, createDraft.save, editDraft.save]);

  // ── Handlers ──
  const resetForm = () => {
    setTitle('');
    setContent('');
    setDate(today());
    setEditingEntryId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAll()) return;
    const isEditing = editingEntryId !== null;

    try {
      await apiFetch(
        isEditing ? `${DIARY_API.base}/${editingEntryId}` : DIARY_API.base,
        {
          method: isEditing ? 'PUT' : 'POST',
          body: JSON.stringify({ title, content, date }),
        },
      );
      // Clear the relevant draft on success
      if (isEditing) {
        editDraft.clear();
      } else {
        createDraft.clear();
      }
      resetForm();
      refetch();
      addToast(isEditing ? '日记已更新' : '日记已保存', 'success');
      if (isEditing) setActiveTab('review');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
      // Do NOT clear draft on failure
    }
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntryId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setDate(entry.date);
    setActiveTab('write');
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${DIARY_API.base}/${id}`, { method: 'DELETE' });
      refetch();
      addToast('已删除', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  // ── Cancel edit with confirmation ──
  const handleCancelEdit = () => {
    if (title.trim() || content.trim()) {
      setShowDiscardConfirm(true);
    } else {
      editDraft.clear();
      resetForm();
    }
  };

  const confirmDiscard = () => {
    editDraft.clear();
    resetForm();
    setShowDiscardConfirm(false);
  };

  // ── Draft restore ──
  const handleRestoreCreate = () => {
    if (createDraft.draft) {
      setTitle(createDraft.draft.title);
      setContent(createDraft.draft.content);
      setDate(createDraft.draft.date);
    }
    setCreateDraftHandled(true);
  };

  const handleDiscardCreate = () => {
    createDraft.clear();
    setCreateDraftHandled(true);
  };

  const handleRestoreEdit = () => {
    if (editDraft.draft) {
      setTitle(editDraft.draft.title);
      setContent(editDraft.draft.content);
      setDate(editDraft.draft.date);
    }
    if (editingEntryId !== null) {
      setEditDraftHandledId(editingEntryId);
    }
  };

  const handleDiscardEdit = () => {
    editDraft.clear();
    if (editingEntryId !== null) {
      setEditDraftHandledId(editingEntryId);
    }
  };

  const showCreateRestore =
    createDraft.hasDraft && hadCreateDraftOnMount && !createDraftHandled;
  const showEditRestore =
    editDraft.hasDraft &&
    editingEntryId !== null &&
    editDraftHandledId !== editingEntryId &&
    // Only show when the draft actually differs from current form values.
    // Autosave can create a draft from the entry's original content within
    // 1.5s of opening the edit form — that's not real "unsaved work".
    (editDraft.draft?.title !== title ||
     editDraft.draft?.content !== content ||
     editDraft.draft?.date !== date);

  const tabs: { key: ThoughtTab; label: string; icon: string }[] = [
    { key: 'write', label: '记录思考', icon: 'fa-pen' },
    { key: 'ai', label: 'AI对话', icon: 'fa-robot' },
    { key: 'review', label: '回顾日记', icon: 'fa-history' },
  ];

  return (
    <div className="thoughts-page">
      <h2>我的思考</h2>

      <div className="thoughts-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`thoughts-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <i className={`fas ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="thoughts-tab-content">
        {activeTab === 'write' && (
          <form onSubmit={handleSubmit} className="thoughts-form">
            {/* Create draft restore banner */}
            {showCreateRestore && (
              <div className="draft-restore-banner">
                <span>你有未保存的日记草稿，是否恢复？</span>
                <div className="draft-restore-actions">
                  <button type="button" onClick={handleRestoreCreate}>
                    恢复
                  </button>
                  <button type="button" onClick={handleDiscardCreate}>
                    放弃
                  </button>
                </div>
              </div>
            )}

            {/* Edit draft restore banner */}
            {showEditRestore && (
              <div className="draft-restore-banner">
                <span>你有未保存的编辑草稿，是否恢复？</span>
                <div className="draft-restore-actions">
                  <button type="button" onClick={handleRestoreEdit}>
                    恢复
                  </button>
                  <button type="button" onClick={handleDiscardEdit}>
                    放弃
                  </button>
                </div>
              </div>
            )}

            {editingEntryId !== null && (
              <div className="edit-banner">
                <span>正在编辑回顾日记</span>
                <button type="button" onClick={handleCancelEdit}>
                  取消编辑
                </button>
              </div>
            )}

            <div className={`form-group ${errors.title ? 'has-error' : ''}`}>
              <label>标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => touchField('title')}
                placeholder="给你的情绪起个名字"
              />
              {errors.title && <div className="field-error">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label>日期</label>
              <DateInput value={date} onChange={(v) => setDate(v)} required />
            </div>

            <div className={`form-group ${errors.content ? 'has-error' : ''}`}>
              <label>内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => touchField('content')}
                placeholder="在这里记录你的感受..."
                rows={10}
              />
              {errors.content && <div className="field-error">{errors.content}</div>}
            </div>

            <button type="submit" className="submit-btn">
              {editingEntryId !== null ? '更新日记' : '保存日记'}
            </button>
          </form>
        )}

        {activeTab === 'ai' && <ChatView />}

        {activeTab === 'review' && (
          <div className="thoughts-review">
            <div className="form-group review-date-row">
              <label>选择日期</label>
              <DateInput value={reviewDate} onChange={(v) => setReviewDate(v)} />
            </div>

            {error ? (
              <ErrorState
                title="加载失败"
                description={error}
                retry={{ label: '重试', onClick: refetch }}
                compact
              />
            ) : entriesLoading ? (
              <LoadingState label="加载日记..." compact />
            ) : entryList.length === 0 ? (
              <EmptyState
                title="暂无日记"
                description={'请选择日期查找日记，或切换到\u201C记录思考\u201D开始写一篇吧。'}
                icon="fa-regular fa-bookmark"
                compact
              />
            ) : (
              <div className="diary-list">
                {entryList.map((entry) => (
                  <div key={entry.id} className="diary-item">
                    <div className="diary-info">
                      <div className="diary-title">{entry.title}</div>
                      <div className="diary-content">{entry.content}</div>
                      <div className="diary-meta">{entry.date}</div>
                    </div>

                    <div className="diary-actions">
                      <button
                        className="edit-btn-small"
                        onClick={() => handleEdit(entry)}
                        title="编辑"
                      >
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        className="delete-btn-small"
                        onClick={() => handleDelete(entry.id)}
                        title="删除"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discard confirmation dialog */}
        {showDiscardConfirm && (
          <ConfirmDialog
            message="你确定要取消编辑吗？未保存的更改将丢失。"
            onConfirm={confirmDiscard}
            onCancel={() => setShowDiscardConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
