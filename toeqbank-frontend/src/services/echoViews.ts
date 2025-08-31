export interface EchoView {
  name: string;
  description: string;
  structures_visualized: string[];
  angle_range?: string;
  levels?: Array<{
    level: string;
    structures: string[];
  }>;
}

export interface EchoViewCategory {
  [key: string]: EchoView[];
}

export interface EchoViewData {
  transthoracic_echocardiography: EchoViewCategory;
  transesophageal_echocardiography: EchoViewCategory;
}

// Echo views data based on echo_views.json
export const echoViewsData: EchoViewData = {
  "transthoracic_echocardiography": {
    "parasternal_views": [
      {
        "name": "Parasternal Long Axis (PLAX)",
        "description": "Shows LV, LA, aortic root, mitral valve, and LVOT",
        "structures_visualized": ["Left ventricle", "Left atrium", "Aortic root", "Mitral valve", "LVOT", "Interventricular septum", "Posterior wall"]
      },
      {
        "name": "Parasternal Short Axis - Aortic Valve Level",
        "description": "Cross-sectional view at aortic valve level",
        "structures_visualized": ["Aortic valve", "Tricuspid valve", "Right atrium", "Pulmonary artery", "Left atrium"]
      },
      {
        "name": "Parasternal Short Axis - Mitral Valve Level",
        "description": "Cross-sectional view at mitral valve level",
        "structures_visualized": ["Mitral valve", "Left ventricle", "Right ventricle"]
      },
      {
        "name": "Parasternal Short Axis - Papillary Muscle Level",
        "description": "Cross-sectional view at papillary muscle level",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Papillary muscles", "Interventricular septum"]
      },
      {
        "name": "Parasternal Short Axis - Apical Level",
        "description": "Cross-sectional view at apical level",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Apex"]
      },
      {
        "name": "Right Ventricular Inflow",
        "description": "Shows tricuspid valve and right ventricle",
        "structures_visualized": ["Right ventricle", "Right atrium", "Tricuspid valve"]
      },
      {
        "name": "Right Ventricular Outflow",
        "description": "Shows pulmonary valve and main pulmonary artery",
        "structures_visualized": ["Right ventricle", "Pulmonary valve", "Main pulmonary artery"]
      }
    ],
    "apical_views": [
      {
        "name": "Apical 4-Chamber",
        "description": "Shows all four cardiac chambers",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium", "Mitral valve", "Tricuspid valve", "Interventricular septum", "Interatrial septum"]
      },
      {
        "name": "Apical 2-Chamber",
        "description": "Shows LV and LA in sagittal plane",
        "structures_visualized": ["Left ventricle", "Left atrium", "Mitral valve", "Inferior wall", "Anterior wall"]
      },
      {
        "name": "Apical 3-Chamber (Long Axis)",
        "description": "Shows LV, LA, and aortic root",
        "structures_visualized": ["Left ventricle", "Left atrium", "Aortic root", "Mitral valve", "Aortic valve", "LVOT", "Anteroseptal wall", "Inferolateral wall"]
      },
      {
        "name": "Apical 5-Chamber",
        "description": "4-chamber view with aortic root",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium", "Aortic root", "Mitral valve", "Tricuspid valve", "Aortic valve"]
      }
    ],
    "subcostal_views": [
      {
        "name": "Subcostal 4-Chamber",
        "description": "Shows all four chambers from below",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium", "Mitral valve", "Tricuspid valve", "Interatrial septum"]
      },
      {
        "name": "Subcostal Short Axis",
        "description": "Cross-sectional view of ventricles",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Interventricular septum"]
      },
      {
        "name": "Subcostal IVC",
        "description": "Shows inferior vena cava",
        "structures_visualized": ["Inferior vena cava", "Right atrium", "Hepatic veins"]
      },
      {
        "name": "Subcostal Aorta",
        "description": "Shows abdominal aorta",
        "structures_visualized": ["Abdominal aorta"]
      }
    ],
    "suprasternal_views": [
      {
        "name": "Suprasternal Long Axis",
        "description": "Shows aortic arch",
        "structures_visualized": ["Aortic arch", "Ascending aorta", "Descending aorta", "Brachiocephalic vessels"]
      },
      {
        "name": "Suprasternal Short Axis",
        "description": "Shows pulmonary arteries and right PA",
        "structures_visualized": ["Main pulmonary artery", "Right pulmonary artery", "Left pulmonary artery", "Left atrium"]
      }
    ]
  },
  "transesophageal_echocardiography": {
    "upper_esophageal_views": [
      {
        "name": "UE Aortic Arch Long Axis",
        "description": "Shows aortic arch in long axis",
        "angle_range": "0-20°",
        "structures_visualized": ["Aortic arch", "Ascending aorta", "Descending aorta", "Brachiocephalic vessels"]
      },
      {
        "name": "UE Aortic Arch Short Axis",
        "description": "Shows aortic arch in short axis",
        "angle_range": "90-110°",
        "structures_visualized": ["Aortic arch", "Main pulmonary artery", "Right pulmonary artery"]
      }
    ],
    "mid_esophageal_views": [
      {
        "name": "ME 4-Chamber",
        "description": "Mid-esophageal four chamber view",
        "angle_range": "0-20°",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium", "Mitral valve", "Tricuspid valve", "Interatrial septum", "Interventricular septum"]
      },
      {
        "name": "ME 2-Chamber",
        "description": "Mid-esophageal two chamber view",
        "angle_range": "80-100°",
        "structures_visualized": ["Left ventricle", "Left atrium", "Mitral valve", "Left atrial appendage"]
      },
      {
        "name": "ME Long Axis",
        "description": "Mid-esophageal long axis view",
        "angle_range": "120-160°",
        "structures_visualized": ["Left ventricle", "Left atrium", "Aortic root", "Mitral valve", "Aortic valve", "LVOT"]
      },
      {
        "name": "ME Mitral Commissural",
        "description": "Mid-esophageal mitral commissural view",
        "angle_range": "60-70°",
        "structures_visualized": ["Mitral valve", "Left atrium", "Left ventricle", "Anterolateral commissure", "Posteromedial commissure"]
      },
      {
        "name": "ME Aortic Valve Short Axis",
        "description": "Mid-esophageal aortic valve short axis",
        "angle_range": "30-60°",
        "structures_visualized": ["Aortic valve", "Tricuspid valve", "Right atrium", "Pulmonary artery", "Left atrium"]
      },
      {
        "name": "ME Aortic Valve Long Axis",
        "description": "Mid-esophageal aortic valve long axis",
        "angle_range": "120-160°",
        "structures_visualized": ["Aortic valve", "LVOT", "Aortic root", "Left atrium"]
      },
      {
        "name": "ME Right Ventricular Inflow-Outflow",
        "description": "Mid-esophageal RV inflow-outflow view",
        "angle_range": "60-90°",
        "structures_visualized": ["Right ventricle", "Right atrium", "Tricuspid valve", "Pulmonary valve", "Main pulmonary artery"]
      },
      {
        "name": "ME Bicaval",
        "description": "Mid-esophageal bicaval view",
        "angle_range": "80-110°",
        "structures_visualized": ["Superior vena cava", "Inferior vena cava", "Right atrium", "Interatrial septum"]
      },
      {
        "name": "ME Left Atrial Appendage",
        "description": "Mid-esophageal LAA view",
        "angle_range": "45-90°",
        "structures_visualized": ["Left atrial appendage", "Left upper pulmonary vein", "Mitral valve"]
      },
      {
        "name": "ME Ascending Aorta Short Axis",
        "description": "Mid-esophageal ascending aorta short axis",
        "angle_range": "0-60°",
        "structures_visualized": ["Ascending aorta", "Main pulmonary artery", "Right pulmonary artery", "Superior vena cava"]
      },
      {
        "name": "ME Ascending Aorta Long Axis",
        "description": "Mid-esophageal ascending aorta long axis",
        "angle_range": "100-150°",
        "structures_visualized": ["Ascending aorta", "Aortic arch"]
      }
    ],
    "transgastric_views": [
      {
        "name": "TG Mid Short Axis",
        "description": "Transgastric mid short axis view",
        "angle_range": "0-20°",
        "structures_visualized": ["Left ventricle", "Right ventricle", "Interventricular septum", "Papillary muscles"]
      },
      {
        "name": "TG 2-Chamber",
        "description": "Transgastric two chamber view",
        "angle_range": "80-100°",
        "structures_visualized": ["Left ventricle", "Left atrium", "Mitral valve", "Inferior wall", "Anterior wall"]
      },
      {
        "name": "TG Long Axis",
        "description": "Transgastric long axis view",
        "angle_range": "90-120°",
        "structures_visualized": ["Left ventricle", "Left atrium", "Mitral valve", "Aortic root", "LVOT"]
      },
      {
        "name": "TG Right Ventricular Inflow",
        "description": "Transgastric RV inflow view",
        "angle_range": "100-120°",
        "structures_visualized": ["Right ventricle", "Right atrium", "Tricuspid valve"]
      },
      {
        "name": "Deep TG Long Axis",
        "description": "Deep transgastric long axis view",
        "angle_range": "0-20°",
        "structures_visualized": ["Left ventricle", "Mitral valve", "Left atrium", "Aortic valve", "LVOT"]
      }
    ],
    "descending_aorta_views": [
      {
        "name": "Descending Aorta Short Axis",
        "description": "Descending aorta short axis view",
        "angle_range": "0-30°",
        "structures_visualized": ["Descending thoracic aorta"]
      },
      {
        "name": "Descending Aorta Long Axis",
        "description": "Descending aorta long axis view",
        "angle_range": "90-110°",
        "structures_visualized": ["Descending thoracic aorta"]
      }
    ]
  }
};

// Helper function to get all views for a modality
export const getViewsForModality = (modality: 'transthoracic' | 'transesophageal'): Array<{name: string, category: string}> => {
  const modalityKey = modality === 'transthoracic' ? 'transthoracic_echocardiography' : 'transesophageal_echocardiography';
  const modalityData = echoViewsData[modalityKey];
  const views: Array<{name: string, category: string}> = [];
  
  Object.entries(modalityData).forEach(([category, viewArray]) => {
    viewArray.forEach(view => {
      views.push({
        name: view.name,
        category: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      });
    });
  });
  
  return views;
};

// Helper function to get view details
export const getViewDetails = (viewName: string, modality: 'transthoracic' | 'transesophageal'): EchoView | null => {
  const modalityKey = modality === 'transthoracic' ? 'transthoracic_echocardiography' : 'transesophageal_echocardiography';
  const modalityData = echoViewsData[modalityKey];
  
  for (const category of Object.values(modalityData)) {
    const view = category.find(v => v.name === viewName);
    if (view) return view;
  }
  
  return null;
};