import { StudioLayout } from "../studio/StudioLayout";
import DesktopOnlyGate from "../components/DesktopOnlyGate";

export default function Studio() {
  return (
    <DesktopOnlyGate feature="Студия" hint="DAW-студия доступна на компьютере или планшете в альбомной ориентации.">
      <StudioLayout />
    </DesktopOnlyGate>
  );
}
