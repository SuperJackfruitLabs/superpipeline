// Clears the last run's pixel report before a new run records into it.
import { resetReport } from './report';
export default function globalSetup(): void { resetReport(); }
