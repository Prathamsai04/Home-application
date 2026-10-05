import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { humanize } from '@homestay/shared';
import { Button, Modal, Select, Textarea } from './ui';

/** Picks an active team member to assign work to. */
export function AssignDialog({ open, title, currentAssignee, onAssign, onClose, loading }) {
  const staff = useSelector((state) => state.lookups.data.staff);
  const [assigneeId, setAssigneeId] = useState(currentAssignee ?? '');
  useEffect(() => setAssigneeId(currentAssignee ?? ''), [currentAssignee, open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onAssign(assigneeId)} disabled={!assigneeId} loading={loading}>
            Assign
          </Button>
        </>
      }
    >
      <Select
        label="Team member"
        placeholder="Select a team member"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        options={staff.map((member) => ({ value: member.id, label: `${member.name} · ${member.jobTitle || humanize(member.role)}` }))}
      />
    </Modal>
  );
}

/** Collects notes when completing/resolving work. */
export function NotesDialog({ open, title, label, required = false, confirmLabel, onSubmit, onClose, loading, error }) {
  const [notes, setNotes] = useState('');
  useEffect(() => setNotes(''), [open]);
  const invalid = required && !notes.trim();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(notes.trim())} disabled={invalid} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Textarea label={label} required={required} rows={3} value={notes} error={error} onChange={(e) => setNotes(e.target.value)} />
    </Modal>
  );
}
