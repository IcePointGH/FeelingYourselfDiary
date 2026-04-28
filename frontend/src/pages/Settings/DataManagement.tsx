import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { SETTINGS_API } from '../../services/api';

export default function DataManagement() {
  const [loading, setLoading] = useState(false);
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${SETTINGS_API.base}/export`, { method: 'GET' });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feeling-diary-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '导出失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('确定要清空所有数据吗？此操作不可恢复。')) return;
    setLoading(true);
    try {
      await apiFetch(`${SETTINGS_API.base}/clear`, { method: 'DELETE' });
      addToast('数据已清空', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '清空失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-options">
      <button className="action-btn export-btn" onClick={handleExport} disabled={loading}>
        数据分析预览（导入示例数据）
      </button>
      <button className="action-btn clear-btn" onClick={handleClear} disabled={loading}>
        一键清除数据
      </button>
    </div>
  );
}
