import { configureStore, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchCategories = createAsyncThunk(
  "catalog/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/catalog-api/api/categories");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "לא ניתן לטעון את המוצרים.");
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "לא ניתן להתחבר לשרת הקטלוג.");
    }
  }
);

const catalogSlice = createSlice({
  name: "catalog",
  initialState: { categories: [], status: "idle", error: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchCategories.pending, state => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "טעינת המוצרים נכשלה.";
      });
  }
});

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] },
  reducers: {
    addProduct(state, action) {
      const existing = state.items.find(item => item.id === action.payload.product.id);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + action.payload.quantity);
      } else {
        state.items.push({ ...action.payload.product, quantity: action.payload.quantity });
      }
    },
    setQuantity(state, action) {
      const item = state.items.find(product => product.id === action.payload.id);
      if (item) {
        item.quantity = Math.max(1, Math.min(99, action.payload.quantity));
      }
    },
    removeProduct(state, action) {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    }
  }
});

export const { addProduct, setQuantity, removeProduct, clearCart } = cartSlice.actions;

export const store = configureStore({
  reducer: {
    catalog: catalogSlice.reducer,
    cart: cartSlice.reducer
  }
});
