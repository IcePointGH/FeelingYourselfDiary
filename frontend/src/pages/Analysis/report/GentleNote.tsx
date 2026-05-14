import './ReportCard.css';

interface GentleNoteProps {
  text: string;
}

export default function GentleNote({ text }: GentleNoteProps) {
  return (
    <p className="gentle-note">
      <i className="fas fa-feather-alt" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
