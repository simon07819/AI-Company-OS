import { artifactManagerPlaybook } from "./artifact-manager-playbook";
import { brandStrategistPlaybook } from "./brand-strategist-playbook";
import { ceoPlaybook } from "./ceo-playbook";
import { creativeDirectorPlaybook } from "./creative-director-playbook";
import { frontendBuilderPlaybook } from "./frontend-builder-playbook";
import { logoDesignerPlaybook } from "./logo-designer-playbook";
import { productOwnerPlaybook } from "./product-owner-playbook";
import { qualityDirectorPlaybook } from "./quality-director-playbook";
import { svgIllustratorPlaybook } from "./svg-illustrator-playbook";
import { uxDesignerPlaybook } from "./ux-designer-playbook";
import { webDesignerPlaybook } from "./web-designer-playbook";

export const playbookRegistry = {
  ceo: ceoPlaybook,
  product_owner: productOwnerPlaybook,
  brand_strategist: brandStrategistPlaybook,
  logo_designer: logoDesignerPlaybook,
  creative_director: creativeDirectorPlaybook,
  svg_illustrator: svgIllustratorPlaybook,
  ux_designer: uxDesignerPlaybook,
  web_designer: webDesignerPlaybook,
  frontend_builder: frontendBuilderPlaybook,
  quality_director: qualityDirectorPlaybook,
  artifact_manager: artifactManagerPlaybook,
};

export type PlaybookRole = keyof typeof playbookRegistry;
