import './ReportCard.css';

interface GentleNoteProps {
  text: string;
}

export default function GentleNote({ text }: GentleNoteProps) {
  return (
    <footer className="gentle-note">
      <span><strong>小七批注：</strong>{text}</span>
      <span className="archive-ref">Archive Ref.</span>
    </footer>
  );
}
